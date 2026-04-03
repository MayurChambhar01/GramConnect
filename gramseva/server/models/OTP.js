const mongoose = require('mongoose');

const OTPSchema = new mongoose.Schema(
  {
    mobile: { type: String, required: true, trim: true, index: true },
    otp: { type: String, required: true, trim: true },
    expiresAt: { type: Date, required: true, index: true },
  },
  {
    timestamps: true,
  }
);

OTPSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.models.OTP || mongoose.model('OTP', OTPSchema);
