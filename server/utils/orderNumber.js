const Counter = require('../models/Counter');

async function generateOrderNumber(tenantId, prefix = 'CZ') {
  const year   = new Date().getFullYear();
  const filter = tenantId ? { year, tenantId } : { year };
  const counter = await Counter.findOneAndUpdate(
    filter,
    { $inc: { seq: 1 } },
    { upsert: true, new: true }
  );
  return `${String(prefix).toUpperCase()}-${year}-${String(counter.seq).padStart(4, '0')}`;
}

module.exports = generateOrderNumber;
