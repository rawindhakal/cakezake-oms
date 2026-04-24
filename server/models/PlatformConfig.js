const mongoose = require('mongoose');

// Stores sensitive API credentials in DB so they can be edited from the UI.
// Values are stored as-is; only masked on read via the API.
const PlatformConfigSchema = new mongoose.Schema({
  key:   { type: String, unique: true, required: true },
  value: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('PlatformConfig', PlatformConfigSchema);
