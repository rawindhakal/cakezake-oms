const mongoose = require('mongoose');

// Single-document config (one per tenant or global)
const EmailConfigSchema = new mongoose.Schema({
  enabled:    { type: Boolean, default: false },
  adminEmail: { type: String, default: '' },   // who receives new-order alerts
  fromName:   { type: String, default: 'CakeZake Orders' },
  fromEmail:  { type: String, default: '' },
  host:       { type: String, default: '' },
  port:       { type: Number, default: 587 },
  secure:     { type: Boolean, default: false }, // true = SSL/465, false = TLS/587
  user:       { type: String, default: '' },
  pass:       { type: String, default: '' },     // stored as-is (no extra encryption)
}, { timestamps: true });

module.exports = mongoose.model('EmailConfig', EmailConfigSchema);
