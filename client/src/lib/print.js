import dayjs from 'dayjs';

const BRAND = 'CakeZake';
const ADDRESS = 'Birtamode-5, Jhapa, Nepal';
const PHONE = '+977 984XXXXXXX';

function npr(n) {
  return 'NPR ' + (n || 0).toLocaleString('en-IN');
}

function baseStyles() {
  return `
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: Arial, sans-serif; font-size: 13px; color: #111; }
      h1 { font-size: 20px; } h2 { font-size: 15px; } h3 { font-size: 13px; }
      .text-sm { font-size: 11px; } .text-xs { font-size: 10px; }
      .text-gray { color: #666; }
      table { width: 100%; border-collapse: collapse; }
      th, td { padding: 6px 8px; text-align: left; border-bottom: 1px solid #eee; }
      th { background: #f5f5f5; font-weight: 600; }
      .right { text-align: right; }
      .bold { font-weight: 700; }
      .section { margin-bottom: 16px; }
      .divider { border-top: 1px dashed #ccc; margin: 12px 0; }
      .row { display: flex; justify-content: space-between; margin: 3px 0; }
      .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 600; }
      @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
    </style>
  `;
}

function openPrint(html, title) {
  const w = window.open('', '_blank', 'width=800,height=600');
  w.document.write(`<!DOCTYPE html><html><head><title>${title}</title>${baseStyles()}</head><body>${html}</body></html>`);
  w.document.close();
  w.focus();
  setTimeout(() => { w.print(); }, 400);
}

// ─── Bill / Invoice ────────────────────────────────────────────────────────────
export function printBill(order) {
  const date = dayjs(order.createdAt).format('DD MMM YYYY, hh:mm A');
  const deliveryDate = dayjs(order.delivery?.date).format('DD MMM YYYY');

  const itemRows = (order.items || []).map((item) => {
    const details = [item.flavor, item.size, item.shape, item.arrangement, item.flowerType, item.giftType]
      .filter(Boolean).join(', ');
    return `
      <tr>
        <td>${item.name}${details ? `<br><span class="text-gray text-xs">${details}</span>` : ''}${item.cakeMessage ? `<br><span class="text-xs">✏️ "${item.cakeMessage}"</span>` : ''}</td>
        <td>${item.category || ''}</td>
        <td class="right">${npr(item.price)}</td>
      </tr>`;
  }).join('');

  const html = `
    <div style="max-width:560px; margin:0 auto; padding:24px;">
      <div style="text-align:center; margin-bottom:16px;">
        <h1>🎂 ${BRAND}</h1>
        <p class="text-sm text-gray">${ADDRESS} · ${PHONE}</p>
        <p class="text-sm text-gray">Order Receipt</p>
      </div>

      <div class="divider"></div>

      <div class="section">
        <div class="row"><span class="bold">Order #</span><span>${order.orderNumber}</span></div>
        <div class="row"><span class="text-gray">Date</span><span>${date}</span></div>
        <div class="row"><span class="text-gray">Status</span><span class="bold">${order.status}</span></div>
      </div>

      <div class="divider"></div>

      <div class="section">
        <h3 style="margin-bottom:6px;">Customer</h3>
        <div class="row"><span class="text-gray">Name</span><span>${order.sender?.name}</span></div>
        <div class="row"><span class="text-gray">Phone</span><span>${order.sender?.phone}</span></div>
        ${order.sender?.socialId ? `<div class="row"><span class="text-gray">Social</span><span>${order.sender.socialId}</span></div>` : ''}
        <div class="row"><span class="text-gray">Channel</span><span>${order.sender?.channel}</span></div>
      </div>

      <div class="divider"></div>

      <table>
        <thead><tr><th>Item</th><th>Category</th><th class="right">Price</th></tr></thead>
        <tbody>${itemRows}</tbody>
      </table>

      <div class="divider"></div>

      <div class="section" style="padding-left:8px;">
        <div class="row"><span>Subtotal</span><span>${npr(order.payment?.total)}</span></div>
        <div class="row" style="color:#16a34a;"><span>Advance Paid</span><span>- ${npr(order.payment?.advance)}</span></div>
        <div class="divider"></div>
        <div class="row bold" style="font-size:15px;"><span>Due on Delivery</span><span style="color:${order.payment?.due > 0 ? '#dc2626' : '#16a34a'};">${npr(order.payment?.due)}</span></div>
        ${order.payment?.method ? `<div class="row text-gray"><span>Payment Method</span><span>${order.payment.method}</span></div>` : ''}
      </div>

      <div class="divider"></div>

      <div class="section">
        <h3 style="margin-bottom:6px;">Delivery</h3>
        <div class="row"><span class="text-gray">To</span><span>${order.receiver?.name} · ${order.receiver?.phone}</span></div>
        <div class="row"><span class="text-gray">Address</span><span>${order.receiver?.city}${order.receiver?.landmark ? ', ' + order.receiver.landmark : ''}</span></div>
        <div class="row"><span class="text-gray">Date</span><span class="bold">${deliveryDate}</span></div>
        ${order.delivery?.slot ? `<div class="row"><span class="text-gray">Slot</span><span>${order.delivery.slot}</span></div>` : ''}
      </div>

      ${order.note ? `<div class="divider"></div><div class="section"><span class="text-gray">Note: </span>${order.note}</div>` : ''}

      <div class="divider"></div>
      <p style="text-align:center; color:#888; font-size:11px;">Thank you for choosing ${BRAND}! 🧁<br>Questions? Contact us on WhatsApp.</p>
    </div>`;

  openPrint(html, `Invoice — ${order.orderNumber}`);
}

// ─── Shipping Label ────────────────────────────────────────────────────────────
export function printShippingLabel(order) {
  const deliveryDate = dayjs(order.delivery?.date).format('DD MMM YYYY');

  const html = `
    <div style="width:380px; border:3px solid #111; padding:24px; margin:20px auto; border-radius:8px;">
      <div style="text-align:center; border-bottom:2px solid #111; padding-bottom:12px; margin-bottom:12px;">
        <span style="font-size:11px; letter-spacing:2px; color:#666;">FROM</span>
        <p class="bold" style="font-size:15px;">🎂 ${BRAND}</p>
        <p class="text-sm text-gray">${ADDRESS}</p>
      </div>

      <div style="margin-bottom:16px;">
        <span style="font-size:11px; letter-spacing:2px; color:#666;">DELIVER TO</span>
        <p class="bold" style="font-size:22px; margin-top:4px;">${order.receiver?.name}</p>
        <p style="font-size:16px; margin:4px 0;">${order.receiver?.phone}</p>
        <p class="bold" style="font-size:18px; color:#1d4ed8;">${order.receiver?.city}</p>
        ${order.receiver?.landmark ? `<p class="text-sm" style="margin-top:4px;">${order.receiver.landmark}</p>` : ''}
      </div>

      <div style="border-top:2px dashed #ccc; padding-top:12px; display:flex; justify-content:space-between; align-items:center;">
        <div>
          <p class="text-xs text-gray">ORDER</p>
          <p class="bold" style="font-size:16px;">${order.orderNumber}</p>
        </div>
        <div style="text-align:right;">
          <p class="text-xs text-gray">DELIVERY DATE</p>
          <p class="bold" style="font-size:14px;">${deliveryDate}</p>
          ${order.delivery?.slot ? `<p class="text-xs text-gray">${order.delivery.slot}</p>` : ''}
        </div>
      </div>

      ${order.payment?.due > 0 ? `
      <div style="background:#fef2f2; border:1px solid #fca5a5; border-radius:6px; padding:8px 12px; margin-top:12px;">
        <p class="text-xs text-gray">COLLECT ON DELIVERY</p>
        <p class="bold" style="font-size:18px; color:#dc2626;">${npr(order.payment.due)}</p>
      </div>` : `
      <div style="background:#f0fdf4; border:1px solid #86efac; border-radius:6px; padding:8px 12px; margin-top:12px;">
        <p class="bold" style="color:#16a34a;">✓ PAID IN FULL</p>
      </div>`}
    </div>`;

  openPrint(html, `Shipping Label — ${order.orderNumber}`);
}

// ─── Kitchen Order Sheet ───────────────────────────────────────────────────────
export function printKitchenSheet(order) {
  const deliveryDate = dayjs(order.delivery?.date).format('DD MMM YYYY');

  const allItems = (order.items || []).map((item) => {
    const fields = [
      item.flavor      && `Flavor: ${item.flavor}`,
      item.size        && `Size: ${item.size}`,
      item.shape       && `Shape: ${item.shape}`,
      item.layers      && `Layers: ${item.layers}`,
      item.theme       && `Theme: ${item.theme}`,
      item.arrangement && `Arrangement: ${item.arrangement}`,
      item.flowerType  && `Flowers: ${item.flowerType}`,
      item.stems       && `Stems: ${item.stems}`,
      item.color       && `Color: ${item.color}`,
      item.giftType    && `Gift: ${item.giftType}`,
      item.wrapping    && `Wrapping: ${item.wrapping}`,
      item.brand       && `Brand: ${item.brand}`,
      item.quantity    && `Qty: ${item.quantity}`,
    ].filter(Boolean);

    return `
      <div style="border:1px solid #e5e7eb; border-radius:8px; padding:12px; margin-bottom:12px; ${item.category === 'Cake' ? 'border-left:4px solid #f97316;' : 'border-left:4px solid #3b82f6;'}">
        <div style="display:flex; justify-content:space-between;">
          <span class="bold" style="font-size:15px;">${item.name}</span>
          <span style="background:#f3f4f6; padding:2px 8px; border-radius:12px; font-size:11px;">${item.category || ''}</span>
        </div>
        ${fields.length ? `<p style="margin-top:6px; color:#555;">${fields.join(' · ')}</p>` : ''}
        ${item.cakeMessage ? `<div style="background:#fdf2f8; border:1px solid #fbcfe8; border-radius:4px; padding:6px 10px; margin-top:8px;"><span style="font-size:11px; color:#9d174d;">✏️ MESSAGE ON CAKE:</span><p class="bold" style="font-size:15px; color:#be185d;">"${item.cakeMessage}"</p></div>` : ''}
        ${item.giftMessage ? `<div style="background:#f5f3ff; border:1px solid #ddd6fe; border-radius:4px; padding:6px 10px; margin-top:8px;"><span style="font-size:11px; color:#6d28d9;">💌 PERSONALIZATION:</span><p style="color:#5b21b6;">"${item.giftMessage}"</p></div>` : ''}
        ${item.specialNote ? `<div style="background:#fff7ed; border:1px solid #fed7aa; border-radius:4px; padding:6px 10px; margin-top:8px;"><span style="font-size:11px; color:#c2410c;">⚠️ NOTE:</span><p style="color:#9a3412;">${item.specialNote}</p></div>` : ''}
        <div style="margin-top:8px; display:flex; gap:12px; align-items:center;">
          <span style="font-size:12px; color:#6b7280;">Status: <span class="bold">□ Pending  □ Preparing  □ Prepared</span></span>
        </div>
      </div>`;
  }).join('');

  const html = `
    <div style="max-width:600px; margin:0 auto; padding:24px;">
      <div style="text-align:center; margin-bottom:20px;">
        <h1>🎂 ${BRAND} — Order Sheet</h1>
      </div>

      <div style="display:flex; justify-content:space-between; background:#f9fafb; border-radius:8px; padding:12px 16px; margin-bottom:20px;">
        <div>
          <p class="text-xs text-gray">ORDER NUMBER</p>
          <p class="bold" style="font-size:18px;">${order.orderNumber}</p>
          <p class="text-sm">${order.sender?.name} · ${order.sender?.phone}</p>
        </div>
        <div style="text-align:right;">
          <p class="text-xs text-gray">DELIVERY</p>
          <p class="bold" style="font-size:16px; color:#1d4ed8;">${deliveryDate}</p>
          ${order.delivery?.slot ? `<p class="text-sm text-gray">${order.delivery.slot}</p>` : ''}
          <p class="text-sm">${order.receiver?.name} · ${order.receiver?.city}</p>
        </div>
      </div>

      <h3 style="margin-bottom:10px;">Items (${(order.items || []).length})</h3>
      ${allItems}

      ${order.note ? `<div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:6px; padding:10px 14px; margin-top:8px;"><span class="text-xs text-gray">INTERNAL NOTE: </span><p>${order.note}</p></div>` : ''}

      <div style="border-top:1px dashed #ccc; margin-top:20px; padding-top:12px; display:flex; justify-content:space-between;">
        <p class="text-sm text-gray">Printed ${dayjs().format('DD MMM YYYY, hh:mm A')}</p>
        <p class="text-sm">Due: <span class="bold" style="color:#dc2626;">${npr(order.payment?.due)}</span></p>
      </div>
    </div>`;

  openPrint(html, `Order Sheet — ${order.orderNumber}`);
}
