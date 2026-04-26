'use strict';

const nodemailer  = require('nodemailer');
const EmailConfig = require('../models/EmailConfig');

function formatItems(items = []) {
  return items
    .map((i) => `  • ${i.name} — NPR ${Number(i.price).toLocaleString('en-IN')}`)
    .join('\n');
}

function formatDate(date) {
  return new Date(date).toLocaleDateString('en-IN', { timeZone: 'Asia/Kathmandu' });
}

/**
 * Load config and create a transporter. Returns null if not configured/enabled.
 */
async function getTransporter() {
  const cfg = await EmailConfig.findOne().lean();
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
 * Send a new-order alert email to the admin.
 * Fire-and-forget — never throws to the caller.
 */
async function sendNewOrderAlert(order) {
  try {
    const result = await getTransporter();
    if (!result) return;
    const { transporter, cfg } = result;

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
      <tr><td style="padding:6px 0;color:#888">Items</td><td><pre style="margin:0;font-family:inherit">${formatItems(items)}</pre></td></tr>
      <tr><td style="padding:6px 0;color:#888">Total</td><td><strong>NPR ${Number(payment.total).toLocaleString('en-IN')}</strong></td></tr>
      <tr><td style="padding:6px 0;color:#888">Advance</td><td>NPR ${Number(payment.advance).toLocaleString('en-IN')}</td></tr>
      <tr><td style="padding:6px 0;color:#888;color:#e11d48">Due</td><td style="color:#e11d48;font-weight:bold">NPR ${Number(payment.due).toLocaleString('en-IN')}</td></tr>
      <tr><td style="padding:6px 0;color:#888">Receiver</td><td>${receiver.name} · ${receiver.phone}${receiver.city ? ` · ${receiver.city}` : ''}</td></tr>
      <tr><td style="padding:6px 0;color:#888">Delivery</td><td>${formatDate(delivery.date)}, ${delivery.slot || ''}</td></tr>
    </table>
    <div style="margin-top:20px;text-align:center">
      <a href="${process.env.CLIENT_URL || 'https://orders.cakezake.com'}/orders"
         style="background:#f97316;color:#fff;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:bold">
        View in Dashboard →
      </a>
    </div>
  </div>
  <div style="padding:12px 24px;background:#fafafa;font-size:12px;color:#aaa;text-align:center">
    CakeZake Order Management System
  </div>
</div>`;

    await transporter.sendMail({
      from:    `"${cfg.fromName || 'CakeZake Orders'}" <${cfg.fromEmail || cfg.user}>`,
      to:      cfg.adminEmail,
      subject: `🎂 New Order ${orderNumber} — NPR ${Number(payment.total).toLocaleString('en-IN')}`,
      html,
    });
  } catch (err) {
    console.error('[email] Failed to send new-order alert:', err.message);
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
    from:    `"${cfg.fromName || 'CakeZake'}" <${cfg.fromEmail || cfg.user}>`,
    to:      toEmail,
    subject: '✅ CakeZake Email Config Test',
    text:    'Your email notification settings are working correctly!',
  });
}

module.exports = { sendNewOrderAlert, sendTestEmail };
