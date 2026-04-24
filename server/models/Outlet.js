const mongoose = require('mongoose');

const OutletSchema = new mongoose.Schema({
  name:     { type: String, required: true },
  city:     { type: String, required: true },
  address:  { type: String },
  phone:    { type: String },
  isActive: { type: Boolean, default: true },

  kitchen: {
    label:       { type: String, default: 'Kitchen' },
    responsible: { type: String },
    notes:       { type: String },
  },

  prepArea: {
    label:       { type: String, default: 'Order Preparation Area' },
    responsible: { type: String },
    notes:       { type: String },
  },
}, { timestamps: true });

module.exports = mongoose.model('Outlet', OutletSchema);
