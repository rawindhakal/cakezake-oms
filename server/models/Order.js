const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
  orderNumber: { type: String },

  sender: {
    name:     { type: String, required: true },
    phone:    { type: String, required: true },
    socialId: { type: String },
    channel:  {
      type: String,
      enum: ['Instagram', 'Facebook', 'WhatsApp', 'Website', 'Walk-in', 'Phone Call'],
      required: true,
    },
  },

  items: [{
    category:    { type: String, enum: ['Cake', 'Flower', 'Gifts', 'Plant', 'Chocolate', 'Combo'] },
    name:        { type: String, required: true },
    // Cake
    flavor:      { type: String },
    size:        { type: String },
    shape:       { type: String },
    layers:      { type: String },
    cakeMessage: { type: String },
    theme:       { type: String },
    // Flower
    arrangement: { type: String },
    flowerType:  { type: String },
    stems:       { type: String },
    color:       { type: String },
    includesVase:{ type: String },
    // Gifts
    giftType:    { type: String },
    wrapping:    { type: String },
    giftMessage: { type: String },
    // Plant
    plantType:   { type: String },
    potSize:     { type: String },
    potType:     { type: String },
    // Chocolate
    brand:       { type: String },
    boxType:     { type: String },
    quantity:    { type: String },
    // Shared
    specialNote:      { type: String },
    referenceImages:  [{ type: String }],   // customer-supplied reference photos
    completedImages:  [{ type: String }],   // photos taken when item is marked Prepared
    itemStatus: {
      type: String,
      enum: ['Pending', 'Preparing', 'Prepared'],
      default: 'Pending',
    },
    price: { type: Number, required: true },
  }],

  payment: {
    total:   { type: Number, required: true },
    advance: { type: Number, default: 0 },
    due:     { type: Number },
    method:  { type: String, enum: ['Cash', 'eSewa', 'Khalti', 'Bank Transfer', 'QR'] },
  },

  receiver: {
    name:     { type: String, required: true },
    phone:    { type: String, required: true },
    city:     { type: String, required: true },
    landmark: { type: String },
  },

  assignedRider: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

  delivery: {
    date:                { type: Date, required: true },
    slot:                { type: String, enum: ['7AM–10AM', '10AM–1PM', '1PM–4PM', '4PM–7PM', '7PM–9PM', 'Anytime'] },
    partner:             { type: String },
    notes:               { type: String },
    signature:           { type: String },   // base64 PNG of customer signature
    signedAt:            { type: Date },
    receiverConfirmName: { type: String },   // name customer typed/confirmed
  },

  fulfillmentType: {
    type: String,
    enum: ['delivery', 'pickup'],
    default: 'delivery',
  },

  status: {
    type: String,
    enum: ['New', 'Confirmed', 'In Production', 'Out for Delivery', 'Delivered', 'Cancelled'],
    default: 'New',
  },

  outlet:    { type: mongoose.Schema.Types.ObjectId, ref: 'Outlet', default: null },

  note:      { type: String },
  createdBy: { type: String, default: 'admin' },

  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date },
}, { timestamps: true });

OrderSchema.index({ status: 1, createdAt: -1 });
OrderSchema.index({ outlet: 1, status: 1, createdAt: -1 });
OrderSchema.index({ 'delivery.date': 1, status: 1 });
OrderSchema.index({ 'sender.phone': 1 });
OrderSchema.index({ orderNumber: 1 });
OrderSchema.index({ isDeleted: 1, createdAt: -1 });

module.exports = mongoose.model('Order', OrderSchema);
