const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
  paymentId:     { type: String, unique: true },
  user:          { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  tax:           { type: mongoose.Schema.Types.ObjectId, ref: 'Tax' },
  amount:        { type: Number, required: true },
  type:          { type: String, default: 'tax' },
  description:   { type: String },
  method:        { type: String, enum: ['UPI','NetBanking','Card','Cash'], default: 'UPI' },
  upiId:         { type: String },
  razorpayOrderId:   { type: String },
  razorpayPaymentId: { type: String },
  status:        { type: String, enum: ['Pending','Success','Failed'], default: 'Success' },
  receiptNumber: { type: String },
  createdAt:     { type: Date, default: Date.now }
});

PaymentSchema.pre('save', function(next) {
  if (this.isNew) {
    this.paymentId = 'PAY-' + Date.now().toString(36).toUpperCase();
    this.receiptNumber = 'RCP-' + new Date().getFullYear() + '-' + Math.floor(10000 + Math.random() * 90000);
  }
  next();
});

module.exports = mongoose.model('Payment', PaymentSchema);
