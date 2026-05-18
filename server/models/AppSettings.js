const mongoose = require('mongoose');

const AppSettingsSchema = new mongoose.Schema({
  key:      { type: String, required: true },
  label:    { type: String },
  values:   [{ type: String }],
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', index: true },
}, { timestamps: true });

AppSettingsSchema.index({ key: 1, tenantId: 1 }, { unique: true });

module.exports = mongoose.model('AppSettings', AppSettingsSchema);
