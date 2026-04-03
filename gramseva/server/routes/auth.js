const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { sendOTP, verifyOTP } = require('../utils/otp');

const signToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET || 'gramseva_secret_2024', { expiresIn: '7d' });

// Send OTP
router.post('/send-otp', async (req, res) => {
  try {
    const { mobile } = req.body;
    if (!mobile || mobile.length !== 10) return res.status(400).json({ success: false, message: 'Enter valid 10-digit mobile' });
    const result = await sendOTP(mobile);
    res.json({ success: true, message: `OTP sent to ${mobile}`, demo: result.demo, ...(result.demo ? { otp: result.otp } : {}) });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Verify OTP
router.post('/verify-otp', (req, res) => {
  const { mobile, otp } = req.body;
  const result = verifyOTP(mobile, otp);
  if (!result.valid) return res.status(400).json({ success: false, message: result.message });
  res.json({ success: true, message: 'OTP verified' });
});

// Register - document upload mandatory
router.post('/register', (req, res, next) => { req.uploadFolder = 'documents'; next(); },
  upload.single('document'), async (req, res) => {
  try {
    const { name, aadhaarNumber, age, gender, mobile, address, village, pincode,
      password, documentType, familyPin, securityQuestion, securityAnswer, familyMembers,
      allowMembersViewRecords, requireHeadApproval, freezeAllMemberAccess } = req.body;

    if (!req.file) return res.status(400).json({ success: false, message: 'Identity proof document is mandatory. Please upload Aadhaar/Ration Card/Voter ID.' });
    const existing = await User.findOne({ $or: [{ mobile }, { aadhaarNumber }] });
    if (existing) return res.status(400).json({ success: false, message: 'Mobile or Aadhaar already registered' });

    let members = [];
    try { members = familyMembers ? JSON.parse(familyMembers) : []; } catch {}

    const user = await User.create({
      name, aadhaarNumber, age: Number(age), gender, mobile, address, village, pincode,
      password, documentType: documentType || 'aadhaar',
      documentPath: req.file.path, documentOriginalName: req.file.originalname,
      familyPin, securityQuestion, securityAnswer: securityAnswer || '',
      familyMembers: members,
      allowMembersViewRecords: allowMembersViewRecords !== 'false',
      requireHeadApproval: requireHeadApproval !== 'false',
      freezeAllMemberAccess: freezeAllMemberAccess === 'true'
    });

    res.status(201).json({
      success: true, message: 'Family registered successfully',
      token: signToken(user._id),
      user: { id: user._id, name: user.name, role: user.role, familyId: user.familyId, village: user.village, mobile: user.mobile, age: user.age, gender: user.gender, address: user.address }
    });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { identifier, password, village, role } = req.body;
    if (!identifier || !password) return res.status(400).json({ success: false, message: 'Please provide credentials' });
    const user = await User.findOne({ $or: [{ mobile: identifier }, { familyId: identifier }] }).select('+password');
    if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });
    if (role === 'admin' && user.role !== 'admin') return res.status(403).json({ success: false, message: 'Admin access denied' });
    if (role === 'villager' && village && !user.village.toLowerCase().includes(village.toLowerCase()))
      return res.status(401).json({ success: false, message: 'Village name does not match' });
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid credentials' });
    res.json({
      success: true, token: signToken(user._id),
      user: { id: user._id, name: user.name, role: user.role, familyId: user.familyId, village: user.village,
        mobile: user.mobile, age: user.age, gender: user.gender, address: user.address, pincode: user.pincode, aadhaarNumber: user.aadhaarNumber }
    });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Member login
router.post('/login/member', async (req, res) => {
  try {
    const { headMobile, aadhaarLast4, pin } = req.body;
    const head = await User.findOne({ mobile: headMobile }).select('+familyPin');
    if (!head) return res.status(401).json({ success: false, message: 'Head account not found' });
    if (head.freezeAllMemberAccess) return res.status(403).json({ success: false, message: 'Member access frozen' });
    const pinMatch = await bcrypt.compare(pin, head.familyPin);
    if (!pinMatch) return res.status(401).json({ success: false, message: 'Invalid PIN' });
    const member = head.familyMembers.find(m => m.aadhaarLast4 === aadhaarLast4);
    if (!member) return res.status(404).json({ success: false, message: 'Member not found' });
    if (member.accessFrozen) return res.status(403).json({ success: false, message: 'Access frozen' });
    res.json({ success: true, token: signToken(head._id), user: { id: head._id, name: member.name, role: 'member', familyId: head.familyId, village: head.village } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Get profile
router.get('/me', protect, async (req, res) => {
  const user = await User.findById(req.user._id);
  res.json({ success: true, user });
});

// Update profile
router.patch('/profile', protect, async (req, res) => {
  try {
    const allowed = ['name','address','village','pincode','age','gender','mobile'];
    const updates = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });

    // Handle password change
    if (req.body.password && req.body.oldPassword) {
      const user = await User.findById(req.user._id).select('+password');
      const isMatch = await bcrypt.compare(req.body.oldPassword, user.password);
      if (!isMatch) return res.status(400).json({ success: false, message: 'Current password is incorrect' });
      const salt = await bcrypt.genSalt(12);
      updates.password = await bcrypt.hash(req.body.password, salt);
    }

    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true });
    res.json({ success: true, user, message: 'Profile updated successfully' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Forgot password - send OTP
router.post('/forgot-password', async (req, res) => {
  try {
    const { mobile } = req.body;
    const user = await User.findOne({ mobile });
    if (!user) return res.status(404).json({ success: false, message: 'Mobile not registered' });
    const result = await sendOTP(mobile);
    res.json({ success: true, message: `OTP sent to ${mobile}`, demo: result.demo, ...(result.demo ? { otp: result.otp } : {}) });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Reset password with OTP verify
router.post('/reset-password', async (req, res) => {
  try {
    const { mobile, otp, newPassword } = req.body;
    const check = verifyOTP(mobile, otp);
    if (!check.valid) return res.status(400).json({ success: false, message: check.message });
    const user = await User.findOne({ mobile });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    user.password = newPassword;
    await user.save();
    res.json({ success: true, message: 'Password reset successfully' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
