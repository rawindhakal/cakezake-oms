'use strict';

const nodemailer  = require('nodemailer');
const EmailConfig = require('../models/EmailConfig');

function formatItems(items = [], currency = 'NPR') {
  return items
    .map((i) => `  • ${i.name} — ${currency} ${Number(i.price).toLocaleString('en-IN')}`)
    .join('\n');
}

function formatDate(date) {
  return new Date(date).toLocaleDateString('en-IN', { timeZone: 'Asia/Kathmandu' });
}

/**
 * Load config and create a transporter. Returns null if not configured/enabled.
 */
async function getTransporter(tenantId) {
  const filter = tenantId ? { tenantId } : { tenantId: { $exists: false } };
  const cfg = await EmailConfig.findOne(filter).lean();
  if (!cfg || !cfg.enabled || !cfg.host || !cfg.user || !cfg.pass) return null;

  return {
    transporter: nodemailer.createTransport({
      host:   cfg.host,
      port:   cfg.port || 587,
      secure: cfg.secure || false,
      auth:   { user: cfg.user, pass: cfg.pass },
    }),
    cfg,
  };
}

/**
 * Fetch tenant branding (name + currency). Returns defaults on failure.
 */
async function getTenantBranding(tenantId) {
  try {
    if (!tenantId) return { brandName: 'Order Management System', currency: 'NPR' };
    const Tenant = require('../models/Tenant');
    const tenant = await Tenant.findById(tenantId, 'name currency').lean();
    return {
      brandName: tenant?.name || 'Order Management System',
      currency:  tenant?.currency || 'NPR',
    };
  } catch {
    return { brandName: 'Order Management System', currency: 'NPR' };
  }
}

/**
 * Send a new-order alert email to the admin.
 * Fire-and-forget — never throws to the caller.
 */
async function sendNewOrderAlert(order, tenantId) {
  try {
    const result = await getTransporter(tenantId);
    if (!result) return;
    const { transporter, cfg } = result;

    const { brandName, currency } = await getTenantBranding(tenantId);
    const { sender, receiver, payment, delivery, orderNumber, items } = order;

    const html = `
<div style="font-family:sans-serif;max-width:600px;margin:auto;border:1px solid #eee;border-radius:12px;overflow:hidden">
  <div style="background:#f97316;padding:20px 24px">
    <h1 style="color:#fff;margin:0;font-size:20px">🎂 New Order — ${orderNumber}</h1>
  </div>
  <div style="padding:24px">
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      <tr><td style="padding:6px 0;color:#888;width:140px">Sender</td><td><strong>${sender.name}</strong> · ${sender.phone}</td></tr>
      <tr><td style="padding:6px 0;color:#888">Channel</td><td>${sender.channel || '—'}</td></tr>
      <tr><td style="padding:6px 0;color:#888">Items</td><td><pre style="margin:0;font-family:inherit">${formatItems(items, currency)}</pre></td></tr>
      <tr><td style="padding:6px 0;color:#888">Total</td><td><strong>${currency} ${Number(payment.total).toLocaleString('en-IN')}</strong></td></tr>
      <tr><td style="padding:6px 0;color:#888">Advance</td><td>${currency} ${Number(payment.advance).toLocaleString('en-IN')}</td></tr>
      <tr><td style="padding:6px 0;color:#888;color:#e11d48">Due</td><td style="color:#e11d48;font-weight:bold">${currency} ${Number(payment.due).toLocaleString('en-IN')}</td></tr>
      <tr><td style="padding:6px 0;color:#888">Receiver</td><td>${receiver.name} · ${receiver.phone}${receiver.city ? ` · ${receiver.city}` : ''}</td></tr>
      <tr><td style="padding:6px 0;color:#888">Delivery</td><td>${formatDate(delivery.date)}, ${delivery.slot || ''}</td></tr>
    </table>
    <div style="margin-top:20px;text-align:center">
      <a href="${process.env.CLIENT_URL || 'https://app.example.com'}/orders"
         style="background:#f97316;color:#fff;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:bold">
        View in Dashboard →
      </a>
    </div>
  </div>
  <div style="padding:12px 24px;background:#fafafa;font-size:12px;color:#aaa;text-align:center">
    ${brandName}
  </div>
</div>`;

    await transporter.sendMail({
      from:    `"${cfg.fromName || brandName}" <${cfg.fromEmail || cfg.user}>`,
      to:      cfg.adminEmail,
      subject: `🎂 New Order ${orderNumber} — ${currency} ${Number(payment.total).toLocaleString('en-IN')}`,
      html,
    });
  } catch (err) {
    console.error('[email] Failed to send new-order alert:', err.message);
  }
}

/**
 * Send an order status update email to the admin.
 * Only fires for: Confirmed, Out for Delivery, Delivered.
 * Fire-and-forget — never throws to the caller.
 */
async function sendOrderStatusEmail(order, newStatus, tenantId) {
  try {
    const notifyStatuses = ['Confirmed', 'Out for Delivery', 'Delivered'];
    if (!notifyStatuses.includes(newStatus)) return;

    const result = await getTransporter(tenantId);
    if (!result) return;
    const { transporter, cfg } = result;

    const { brandName, currency } = await getTenantBranding(tenantId);
    const { orderNumber, sender, delivery } = order;

    const statusColors = {
      'Confirmed':        '#8b5cf6',
      'Out for Delivery': '#f97316',
      'Delivered':        '#22c55e',
    };
    const color = statusColors[newStatus] || '#6b7280';

    const html = `
<div style="font-family:sans-serif;max-width:600px;margin:auto;border:1px solid #eee;border-radius:12px;overflow:hidden">
  <div style="background:${color};padding:20px 24px">
    <h1 style="color:#fff;margin:0;font-size:20px">Order Status Updated — ${orderNumber}</h1>
  </div>
  <div style="padding:24px">
    <p style="font-size:15px;color:#374151;margin:0 0 16px">
      Order <strong>${orderNumber}</strong> has been updated to
      <span style="background:${color}22;color:${color};padding:2px 10px;border-radius:20px;font-weight:bold;font-size:14px">${newStatus}</span>
    </p>
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      <tr><td style="padding:6px 0;color:#888;width:140px">Sender</td><td><strong>${sender?.name || '—'}</strong></td></tr>
      <tr><td style="padding:6px 0;color:#888">Delivery Date</td><td>${delivery?.date ? formatDate(delivery.date) : '—'}${delivery?.slot ? `, ${delivery.slot}` : ''}</td></tr>
    </table>
    <div style="margin-top:20px;text-align:center">
      <a href="${process.env.CLIENT_URL || 'https://app.example.com'}/orders"
         style="background:${color};color:#fff;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:bold">
        View Order →
      </a>
    </div>
  </div>
  <div style="padding:12px 24px;background:#fafafa;font-size:12px;color:#aaa;text-align:center">
    ${brandName}
  </div>
</div>`;

    await transporter.sendMail({
      from:    `"${cfg.fromName || brandName}" <${cfg.fromEmail || cfg.user}>`,
      to:      cfg.adminEmail,
      subject: `Order ${orderNumber} — ${newStatus}`,
      html,
    });
  } catch (err) {
    console.error('[email] Failed to send status email:', err.message);
  }
}

/**
 * Send a test email to verify SMTP config.
 */
async function sendTestEmail(cfg, toEmail) {
  const transporter = nodemailer.createTransport({
    host:   cfg.host,
    port:   cfg.port || 587,
    secure: cfg.secure || false,
    auth:   { user: cfg.user, pass: cfg.pass },
  });

  await transporter.sendMail({
    from:    `"${cfg.fromName || 'Order Notifications'}" <${cfg.fromEmail || cfg.user}>`,
    to:      toEmail,
    subject: '✅ Email Config Test',
    text:    'Your email notification settings are working correctly!',
  });
}

module.exports = { sendNewOrderAlert, sendOrderStatusEmail, sendTestEmail };
