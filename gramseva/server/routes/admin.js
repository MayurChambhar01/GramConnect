const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Complaint = require('../models/Complaint');
const Certificate = require('../models/Certificate');
const Tax = require('../models/Tax');
const { SOS } = require('../models/SOSNotification');
const Payment = require('../models/Payment');
const { protect, adminOnly } = require('../middleware/auth');

// GET /api/admin/stats
router.get('/stats', protect, adminOnly, async (req, res) => {
  try {
    const [totalFamilies, totalComplaints, pendingComplaints, resolvedToday,
      pendingCerts, totalTax, liveSOS, totalPayments] = await Promise.all([
      User.countDocuments({ role: 'villager' }),
      Complaint.countDocuments(),
      Complaint.countDocuments({ status: 'Pending' }),
      Complaint.countDocuments({ status:'Resolved', resolvedAt:{ $gte: new Date(new Date().setHours(0,0,0,0)) } }),
      Certificate.countDocuments({ status: { $in: ['Pending','Under Review'] } }),
      Tax.aggregate([{ $match:{ status:'Pending' } },{ $group:{ _id:null, total:{ $sum:'$amount' } } }]),
      SOS.countDocuments({ status:'Active' }),
      Payment.aggregate([{ $match:{ status:'Success' } },{ $group:{ _id:null, total:{ $sum:'$amount' } } }])
    ]);
    res.json({ success:true, stats:{ totalFamilies, totalComplaints, pendingComplaints, resolvedToday, pendingCerts,
      pendingTaxAmount: totalTax[0]?.total||0, liveSOS, totalCollected: totalPayments[0]?.total||0 } });
  } catch(err) { res.status(500).json({ success:false, message:err.message }); }
});

// GET /api/admin/users
router.get('/users', protect, adminOnly, async (req, res) => {
  try {
    const { search, village, page=1, limit=50 } = req.query;
    const filter = { role:'villager' };
    if (search) filter.$or = [{ name:new RegExp(search,'i') },{ mobile:new RegExp(search,'i') },{ familyId:new RegExp(search,'i') }];
    if (village) filter.village = new RegExp(village,'i');
    const users = await User.find(filter).select('-password -familyPin -securityAnswer')
      .sort('-createdAt').skip((page-1)*limit).limit(Number(limit));
    const total = await User.countDocuments(filter);
    res.json({ success:true, users, total });
  } catch(err) { res.status(500).json({ success:false, message:err.message }); }
});

// PATCH /api/admin/users/:id/status — fix: proper toggle
router.patch('/users/:id/status', protect, adminOnly, async (req, res) => {
  try {
    const { isActive } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: Boolean(isActive) },
      { new: true }
    ).select('-password -familyPin -securityAnswer');
    if (!user) return res.status(404).json({ success:false, message:'User not found' });
    res.json({ success:true, message:`User ${user.isActive?'activated':'deactivated'} successfully`, user });
  } catch(err) { res.status(500).json({ success:false, message:err.message }); }
});

// GET /api/admin/users/:id  — get user details + their documents
router.get('/users/:id', protect, adminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password -familyPin -securityAnswer');
    if (!user) return res.status(404).json({ success:false, message:'User not found' });
    res.json({ success:true, user });
  } catch(err) { res.status(500).json({ success:false, message:err.message }); }
});

// POST /api/admin/taxes/assign — admin assigns tax to a user
router.post('/taxes/assign', protect, adminOnly, async (req, res) => {
  try {
    const { userId, type, amount, dueDate, year } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success:false, message:'User not found' });
    const tax = await Tax.create({ user: userId, type, amount: Number(amount), dueDate: new Date(dueDate), year: year || new Date().getFullYear() });
    res.status(201).json({ success:true, message:`₹${amount} ${type} tax assigned to ${user.name}`, tax });
  } catch(err) { res.status(500).json({ success:false, message:err.message }); }
});

// POST /api/admin/taxes/assign-bulk — assign to all villagers
router.post('/taxes/assign-bulk', protect, adminOnly, async (req, res) => {
  try {
    const { type, amount, dueDate } = req.body;
    const users = await User.find({ role:'villager', isActive:true });
    const taxes = users.map(u => ({ user: u._id, type, amount: Number(amount), dueDate: new Date(dueDate), year: new Date().getFullYear() }));
    await Tax.insertMany(taxes);
    res.json({ success:true, message:`Tax assigned to ${users.length} families` });
  } catch(err) { res.status(500).json({ success:false, message:err.message }); }
});

// GET /api/admin/documents — all uploaded documents from cert applications
router.get('/documents', protect, adminOnly, async (req, res) => {
  try {
    const Certificate = require('../models/Certificate');
    // Get users with documentPath
    const usersWithDocs = await User.find({ documentPath:{ $ne:'' }, role:'villager' })
      .select('name mobile village documentPath documentType documentOriginalName familyId createdAt');
    const certs = await Certificate.find({}).populate('user','name mobile village familyId');
    res.json({ success:true, userDocuments: usersWithDocs, certificates: certs });
  } catch(err) { res.status(500).json({ success:false, message:err.message }); }
});

// POST /api/admin/seed
router.post('/seed', async (req, res) => {
  try {
    const exists = await User.findOne({ role:'admin' });
    if (exists) return res.status(400).json({ success:false, message:'Admin already exists. Login with: mobile=9999999999, password=Admin@123' });
    const admin = await User.create({
      name:'Gram Admin', aadhaarNumber:'999999999999', age:40, gender:'Male',
      mobile:'9999999999', address:'Panchayat Office', village:'Rajpur', pincode:'482001',
      password:'Admin@123', role:'admin', familyPin:'0000', securityQuestion:'admin', securityAnswer:'admin'
    });
    res.json({ success:true, message:'Admin seeded successfully', familyId:admin.familyId, mobile:'9999999999', password:'Admin@123' });
  } catch(err) { res.status(500).json({ success:false, message:err.message }); }
});

// GET seed via browser
router.get('/seed', async (req, res) => {
  try {
    const exists = await User.findOne({ role:'admin' });
    if (exists) return res.json({ success:false, message:'Admin already exists. Login: mobile=9999999999, password=Admin@123' });
    const admin = await User.create({
      name:'Gram Admin', aadhaarNumber:'999999999999', age:40, gender:'Male',
      mobile:'9999999999', address:'Panchayat Office', village:'Rajpur', pincode:'482001',
      password:'Admin@123', role:'admin', familyPin:'0000', securityQuestion:'admin', securityAnswer:'admin'
    });
    res.json({ success:true, message:'Admin created! Login: mobile=9999999999, password=Admin@123', familyId:admin.familyId });
  } catch(err) { res.status(500).json({ success:false, message:err.message }); }
});

module.exports = router;
