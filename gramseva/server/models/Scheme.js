const mongoose = require('mongoose');

const SchemeApplicationSchema = new mongoose.Schema({
  applicationId: { type: String, unique: true },
  scheme:        { type: mongoose.Schema.Types.ObjectId, ref: 'Scheme', required: true },
  user:          { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  applicantName: { type: String, required: true },
  age:           { type: Number },
  income:        { type: Number },
  landAcres:     { type: Number },
  bankAccount:   { type: String },
  ifsc:          { type: String },
  reason:        { type: String },
  documents:     [{ type: String }],
  status:        { type: String, enum: ['Pending','Under Review','Approved','Rejected'], default: 'Pending' },
  adminNote:     { type: String, default: '' },
  approvedAt:    { type: Date },
  createdAt:     { type: Date, default: Date.now }
});
SchemeApplicationSchema.pre('save', function(next) {
  if (this.isNew) this.applicationId = 'SCH-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000);
  next();
});

const SchemeSchema = new mongoose.Schema({
  name:        { type: String, required: true },
  description: { type: String, required: true },
  benefit:     { type: String, required: true },
  category:    { type: String, enum: ['housing','employment','agriculture','health','education','other'], default: 'other' },
  eligibility: { type: String },
  maxIncome:   { type: Number },
  minAge:      { type: Number },
  maxAge:      { type: Number },
  isActive:    { type: Boolean, default: true },
  createdAt:   { type: Date, default: Date.now }
});

module.exports.Scheme = mongoose.model('Scheme', SchemeSchema);
module.exports.SchemeApplication = mongoose.model('SchemeApplication', SchemeApplicationSchema);
