const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema({
  tenantId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', index: true },
  userId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  userName:   { type: String },
  action:     { type: String, required: true },
  entityType: { type: String },
  entityId:   { type: mongoose.Schema.Types.ObjectId },
  meta:       { type: mongoose.Schema.Types.Mixed },
}, { timestamps: true });

AuditLogSchema.index({ tenantId: 1, createdAt: -1 });
AuditLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('AuditLog', AuditLogSchema);
