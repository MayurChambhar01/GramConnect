/**
 * OTP Utility — Fast2SMS (India) + Twilio (global) + console fallback (demo)
 * Set env vars:
 *   FAST2SMS_API_KEY — for Fast2SMS (India, recommended, get free at fast2sms.com)
 *   TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN + TWILIO_PHONE — for Twilio
 * Without env vars, OTP prints to console + returns in response (dev only).
 */
const otpStore = new Map();
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

const sendOTP = async (mobile) => {
  const otp = generateOTP();
  otpStore.set(mobile, { otp, expiresAt: Date.now() + 10 * 60 * 1000 });

  // Fast2SMS (India)
  if (process.env.FAST2SMS_API_KEY) {
    try {
      const res = await fetch('https://www.fast2sms.com/dev/bulkV2', {
        method: 'POST',
        headers: { authorization: process.env.FAST2SMS_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ route: 'otp', variables_values: otp, numbers: mobile })
      });
      const data = await res.json();
      if (data.return === true) { console.log(`OTP sent via Fast2SMS to ${mobile}`); return { success: true, demo: false }; }
      console.warn('Fast2SMS:', data);
    } catch (err) { console.error('Fast2SMS error:', err.message); }
  }

  // Twilio
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE) {
    try {
      const twilio = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      await twilio.messages.create({ body: `GramSeva OTP: ${otp}. Valid 10 min. -GramSeva`, from: process.env.TWILIO_PHONE, to: `+91${mobile}` });
      console.log(`OTP sent via Twilio to +91${mobile}`);
      return { success: true, demo: false };
    } catch (err) { console.error('Twilio error:', err.message); }
  }

  console.log(`\n🔐 [DEMO] OTP for ${mobile}: ${otp}\n`);
  return { success: true, demo: true, otp };
};

const verifyOTP = (mobile, otp) => {
  const record = otpStore.get(mobile);
  if (!record) return { valid: false, message: 'OTP not found or expired. Request a new OTP.' };
  if (Date.now() > record.expiresAt) { otpStore.delete(mobile); return { valid: false, message: 'OTP expired. Request a new one.' }; }
  if (record.otp !== String(otp).trim()) return { valid: false, message: 'Incorrect OTP. Try again.' };
  otpStore.delete(mobile);
  return { valid: true };
};

module.exports = { sendOTP, verifyOTP };
