const mongoose = require('mongoose');

const liveCaptureSchema = new mongoose.Schema({
  user:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  purpose:   { type: String, default: 'record' }, // e.g. 'record', 'complaint', 'attendance'
  filename:  { type: String, required: true },
  filePath:  { type: String, required: true },
  lat:       { type: Number },
  lng:       { type: Number },
  accuracy:  { type: Number },
  timestamp: { type: String },
  mapsLink:  { type: String },
}, { timestamps: true });

module.exports = mongoose.model('LiveCapture', liveCaptureSchema);
