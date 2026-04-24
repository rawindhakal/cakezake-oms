const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username:        { type: String, required: true, unique: true, trim: true, lowercase: true },
  password:        { type: String, required: true },
  name:            { type: String, required: true, trim: true },
  role:            { type: String, enum: ['super_admin', 'staff', 'order_processor', 'rider'], default: 'staff' },
  assignedOutlets: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Outlet' }],
  isActive:        { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
