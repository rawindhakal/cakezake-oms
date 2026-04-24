const Counter = require('../models/Counter');

async function generateOrderNumber() {
  const year = new Date().getFullYear();
  const counter = await Counter.findOneAndUpdate(
    { year },
    { $inc: { seq: 1 } },
    { upsert: true, new: true }
  );
  return `CZ-${year}-${String(counter.seq).padStart(4, '0')}`;
}

module.exports = generateOrderNumber;
