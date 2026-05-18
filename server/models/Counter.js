const mongoose = require('mongoose');

const CounterSchema = new mongoose.Schema({
  year:     { type: Number },
  seq:      { type: Number, default: 0 },
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant' },
});

CounterSchema.index({ year: 1, tenantId: 1 }, { unique: true });

module.exports = mongoose.model('Counter', CounterSchema);
