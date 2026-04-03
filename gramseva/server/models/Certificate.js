const mongoose = require('mongoose');

const CertificateSchema = new mongoose.Schema({
  applicationId: { type: String, unique: true },
  user:          { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type:          { type: String, enum: ['income','residence','caste','birth','death','marriage','character','land'], required: true },
  purpose:       { type: String, required: true },
  applicantName: { type: String, required: true },
  details:       { type: Object, default: {} },
  documents:     [{ type: String }],
  status:        { type: String, enum: ['Pending','Under Review','Approved','Rejected','Ready'], default: 'Pending' },
  adminNote:     { type: String, default: '' },
  issuedDate:    { type: Date },
  createdAt:     { type: Date, default: Date.now },
  updatedAt:     { type: Date, default: Date.now }
});

CertificateSchema.pre('save', function (next) {
  if (this.isNew) {
    this.applicationId = 'CERT-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000);
  }
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Certificate', CertificateSchema);
