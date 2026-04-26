const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
  customerPhone: { type: String, required: true, index: true },
  customerName:  { type: String, required: true },
  amount:        { type: Number, required: true },
  method:        { type: String, enum: ['Cash', 'eSewa', 'Khalti', 'Bank Transfer', 'QR'] },
  note:          { type: String },
  /** Set for all new payments via API; optional in schema for legacy rows */
  orderId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Order', index: true },
  orderNumber:   { type: String, index: true },
}, { timestamps: true });

module.exports = mongoose.model('Payment', PaymentSchema);
