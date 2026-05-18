const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username:        { type: String, required: true, unique: true, trim: true, lowercase: true },
  password:        { type: String, required: true },
  name:            { type: String, required: true, trim: true },
  email:           { type: String, trim: true, lowercase: true },
  role:            { type: String, enum: ['platform_owner', 'super_admin', 'staff', 'order_processor', 'rider'], default: 'staff' },
  tenantId:        { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', index: true },
  assignedOutlets: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Outlet' }],
  isActive:        { type: Boolean, default: true },
}, { timestamps: true });

UserSchema.index({ email: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('User', UserSchema);
