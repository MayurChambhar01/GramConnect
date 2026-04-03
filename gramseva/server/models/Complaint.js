const mongoose = require('mongoose');

const ComplaintSchema = new mongoose.Schema({
  complaintId:  { type: String, unique: true },
  user:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  category:     { type: String, enum: ['water','electricity','road','drainage','corruption','other'], required: true },
  description:  { type: String, required: true, trim: true },
  location:     { type: String, required: true },
  gpsLat:       { type: Number },
  gpsLong:      { type: Number },
  photos:       [{ type: String }],
  status:       { type: String, enum: ['Pending','In Progress','Resolved','Rejected'], default: 'Pending' },
  priority:     { type: String, enum: ['Low','Medium','High'], default: 'Medium' },
  adminNote:    { type: String, default: '' },
  rating:       { type: Number, min: 1, max: 5, default: null },
  resolvedAt:   { type: Date },
  createdAt:    { type: Date, default: Date.now },
  updatedAt:    { type: Date, default: Date.now }
});

ComplaintSchema.pre('save', function (next) {
  if (this.isNew) {
    this.complaintId = 'CMP-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000);
  }
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Complaint', ComplaintSchema);
