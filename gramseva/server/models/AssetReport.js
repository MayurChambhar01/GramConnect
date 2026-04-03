const mongoose = require('mongoose');

const AssetSchema = new mongoose.Schema({
  name:       { type: String, required: true },
  type:       { type: String, enum: ['well','streetlight','road','toilet','school','hospital','bridge','pond','temple','other'], default: 'other' },
  location:   { type: String, required: true },
  lat:        { type: Number },
  lng:        { type: Number },
  status:     { type: String, enum: ['Good','Needs Repair','Critical','Under Repair','Inactive'], default: 'Good' },
  description:{ type: String, default: '' },
  ward:       { type: String, default: '' },
  installedOn:{ type: Date },
  lastChecked:{ type: Date, default: Date.now },
  reports:    [{
    user:      { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    issue:     String,
    photo:     String,
    reportedAt:{ type: Date, default: Date.now },
    resolved:  { type: Boolean, default: false }
  }],
  createdAt:  { type: Date, default: Date.now }
});

module.exports = mongoose.model('Asset', AssetSchema);
