const mongoose = require('mongoose');

const ConversationSchema = new mongoose.Schema({
  account:        { type: mongoose.Schema.Types.ObjectId, ref: 'SocialAccount', required: true },
  outlet:         { type: mongoose.Schema.Types.ObjectId, ref: 'Outlet', required: true },
  platform:       { type: String, enum: ['whatsapp', 'instagram', 'facebook', 'tiktok'], required: true },
  externalId:     { type: String, required: true },
  customerName:   { type: String, default: 'Unknown' },
  customerHandle: { type: String },
  customerAvatar: { type: String },
  linkedCustomer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  linkedOrder:    { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  assignedTo:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status:         { type: String, enum: ['open', 'resolved', 'snoozed'], default: 'open' },
  unreadCount:    { type: Number, default: 0 },
  lastMessage:    { type: String, default: '' },
  lastMessageAt:  { type: Date, default: Date.now },
}, { timestamps: true });

ConversationSchema.index({ account: 1, externalId: 1 }, { unique: true });
ConversationSchema.index({ outlet: 1, lastMessageAt: -1 });

module.exports = mongoose.model('Conversation', ConversationSchema);
