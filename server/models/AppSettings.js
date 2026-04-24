const mongoose = require('mongoose');

const AppSettingsSchema = new mongoose.Schema({
  key:    { type: String, unique: true, required: true },
  label:  { type: String },
  values: [{ type: String }],
}, { timestamps: true });

module.exports = mongoose.model('AppSettings', AppSettingsSchema);
