const mongoose = require('mongoose');

const TaxSchema = new mongoose.Schema({
  user:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type:        { type: String, enum: ['property','water','house','sewage','other'], required: true },
  amount:      { type: Number, required: true },
  dueDate:     { type: Date, required: true },
  status:      { type: String, enum: ['Pending','Paid','Overdue','Partial'], default: 'Pending' },
  transactionId: { type: String, default: '' },
  paymentMethod: { type: String, default: '' },
  paidAt:      { type: Date },
  year:        { type: Number, default: () => new Date().getFullYear() },
  createdAt:   { type: Date, default: Date.now }
});

module.exports = mongoose.model('Tax', TaxSchema);
