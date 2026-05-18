const mongoose = require('mongoose');

const TenantSchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true },
  slug:        { type: String, required: true, unique: true, trim: true, lowercase: true },
  ownerName:   { type: String, trim: true },
  ownerEmail:  { type: String, trim: true, lowercase: true },
  phone:       { type: String },
  address:     { type: String },
  city:        { type: String },
  country:     { type: String, default: 'Nepal' },
  currency:    { type: String, default: 'NPR' },
  orderPrefix: { type: String, default: 'CZ', maxlength: 10 },
  isActive:    { type: Boolean, default: true },
  plan:        { type: String, enum: ['free', 'basic', 'pro'], default: 'free' },
  notes:       { type: String },
  planExpiresAt:   { type: Date },
  planActivatedAt: { type: Date },
  maxOrders:       { type: Number, default: null },
}, { timestamps: true });

module.exports = mongoose.model('Tenant', TenantSchema);
