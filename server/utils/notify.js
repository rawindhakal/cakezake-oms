'use strict';

const { sendSMS } = require('./sms');

const BASE_URL = process.env.CLIENT_URL || 'https://orders.cakezake.com';

function formatItems(items = []) {
  return items
    .map((i) => `${i.name} (NPR ${Number(i.price).toLocaleString('en-IN')})`)
    .join(', ');
}

function formatDate(date) {
  return new Date(date).toLocaleDateString('en-IN', { timeZone: 'Asia/Kathmandu' });
}

function trackingUrl(orderNumber) {
  return `${BASE_URL}/track?order=${orderNumber}`;
}

async function sendOrderConfirmation(order) {
  const { sender, receiver, payment, delivery, orderNumber, items } = order;

  const text = [
    `Hello ${sender.name}! Your CakeZake order ${orderNumber} is confirmed.`,
    `Items: ${formatItems(items)}`,
    `Total: NPR ${Number(payment.total).toLocaleString('en-IN')} | Due: NPR ${Number(payment.due).toLocaleString('en-IN')}`,
    `Delivery: ${formatDate(delivery.date)}, ${delivery.slot}`,
    `Track your order: ${trackingUrl(orderNumber)}`,
  ].join('\n');

  return sendSMS(sender.phone, text);
}

async function sendDeliveryReminder(order) {
  const { sender, payment, delivery, orderNumber } = order;

  const text = [
    `Reminder: Order ${orderNumber} delivers tomorrow ${formatDate(delivery.date)} ${delivery.slot}.`,
    `Due: NPR ${Number(payment.due).toLocaleString('en-IN')}.`,
    `Track: ${trackingUrl(orderNumber)} - CakeZake`,
  ].join('\n');

  return sendSMS(sender.phone, text);
}

module.exports = { sendOrderConfirmation, sendDeliveryReminder, trackingUrl };
