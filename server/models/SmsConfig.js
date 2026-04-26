const mongoose = require('mongoose');

const SmsConfigSchema = new mongoose.Schema({
  enabled:  { type: Boolean, default: false },
  token:    { type: String, default: '' },
  senderId: { type: String, default: 'CakeZake' },
}, { timestamps: true });

module.exports = mongoose.model('SmsConfig', SmsConfigSchema);
