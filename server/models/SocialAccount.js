const mongoose = require('mongoose');

const SocialAccountSchema = new mongoose.Schema({
  outlet:       { type: mongoose.Schema.Types.ObjectId, ref: 'Outlet', required: true },
  platform:     { type: String, enum: ['whatsapp', 'instagram', 'facebook', 'tiktok'], required: true },
  label:        { type: String, required: true },
  pageId:       { type: String, required: true }, // WA: phone_number_id | FB/IG: page_id | TT: user_id
  accessToken:  { type: String, required: true },
  refreshToken: { type: String },
  tokenExpiry:  { type: Date },
  metadata:     { type: mongoose.Schema.Types.Mixed, default: {} },
  isActive:     { type: Boolean, default: true },
}, { timestamps: true });

SocialAccountSchema.index({ platform: 1, pageId: 1 }, { unique: true });

module.exports = mongoose.model('SocialAccount', SocialAccountSchema);
