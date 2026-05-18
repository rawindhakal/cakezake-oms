const mongoose = require('mongoose');

const SmsConfigSchema = new mongoose.Schema({
  enabled:  { type: Boolean, default: false },
  token:    { type: String, default: '' },
  senderId:  { type: String, default: 'CakeZake' },
  tenantId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', index: true },
}, { timestamps: true });

module.exports = mongoose.model('SmsConfig', SmsConfigSchema);
