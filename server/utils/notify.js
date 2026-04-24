const twilio = require('twilio');

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

function formatItems(items) {
  return items.map(i => `${i.name} (NPR ${i.price.toLocaleString('en-IN')})`).join(', ');
}

async function sendOrderConfirmation(order) {
  const { sender, receiver, payment, delivery, orderNumber, items } = order;
  const body = `Hello ${sender.name}! 🎂

Your CakeZake order has been confirmed.

📋 Order: ${orderNumber}
🛍️ Items: ${formatItems(items)}
💰 Total: NPR ${payment.total.toLocaleString('en-IN')}
✅ Advance Paid: NPR ${payment.advance.toLocaleString('en-IN')}
💳 Due on Delivery: NPR ${payment.due.toLocaleString('en-IN')}

🚚 Delivery to: ${receiver.name}, ${receiver.city}
📅 Date: ${new Date(delivery.date).toLocaleDateString('en-IN', { timeZone: 'Asia/Kathmandu' })}
⏰ Slot: ${delivery.slot}

Thank you for choosing CakeZake! 🧁
Questions? Reply to this message.`;

  return client.messages.create({
    from: process.env.TWILIO_WHATSAPP_FROM,
    to:   `whatsapp:+977${sender.phone.replace(/^0/, '')}`,
    body,
  });
}

async function sendDeliveryReminder(order) {
  const { sender, receiver, payment, delivery, orderNumber } = order;
  const body = `Reminder: Your CakeZake order ${orderNumber} is scheduled for delivery tomorrow.

📅 ${new Date(delivery.date).toLocaleDateString('en-IN', { timeZone: 'Asia/Kathmandu' })} | ⏰ ${delivery.slot}
📍 Delivering to: ${receiver.name}, ${receiver.city}
💳 Due amount: NPR ${payment.due.toLocaleString('en-IN')}

We'll be in touch! — CakeZake 🎂`;

  return client.messages.create({
    from: process.env.TWILIO_WHATSAPP_FROM,
    to:   `whatsapp:+977${sender.phone.replace(/^0/, '')}`,
    body,
  });
}

module.exports = { sendOrderConfirmation, sendDeliveryReminder };
