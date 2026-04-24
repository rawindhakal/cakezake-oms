const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true },
  direction:    { type: String, enum: ['inbound', 'outbound'], required: true },
  body:         { type: String, default: '' },
  mediaUrl:     { type: String },
  mediaType:    { type: String, enum: ['image', 'video', 'audio', 'document', 'sticker', 'location'] },
  externalId:   { type: String },
  sentBy:       { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  sentAt:       { type: Date, default: Date.now },
  readAt:       { type: Date },
  status:       { type: String, enum: ['sent', 'delivered', 'read', 'failed'], default: 'sent' },
}, { timestamps: true });

MessageSchema.index({ conversation: 1, sentAt: 1 });

module.exports = mongoose.model('Message', MessageSchema);
