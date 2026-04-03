const mongoose = require('mongoose');

const SOSSchema = new mongoose.Schema({
  user:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type:      { type: String, enum: ['medical','fire','police','general'], required: true },
  gpsLat:    { type: Number },
  gpsLong:   { type: Number },
  location:  { type: String, default: '' },
  message:   { type: String, default: '' },
  status:    { type: String, enum: ['Active','Dispatched','Resolved'], default: 'Active' },
  resolvedBy:{ type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  resolvedAt:{ type: Date },
  createdAt: { type: Date, default: Date.now }
});

const NotificationSchema = new mongoose.Schema({
  title:      { type: String, required: true },
  message:    { type: String, required: true },
  target:     { type: String, enum: ['all','ward','family','staff'], default: 'all' },
  targetId:   { type: String, default: '' },
  method:     { type: String, enum: ['push','sms','both'], default: 'push' },
  sentBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reach:      { type: Number, default: 0 },
  isRead:     [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdAt:  { type: Date, default: Date.now }
});

module.exports.SOS = mongoose.model('SOS', SOSSchema);
module.exports.Notification = mongoose.model('Notification', NotificationSchema);
