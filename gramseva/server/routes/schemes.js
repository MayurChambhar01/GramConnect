const express = require('express');
const router = express.Router();
const { Scheme, SchemeApplication } = require('../models/Scheme');
const { protect, adminOnly } = require('../middleware/auth');

// GET /api/schemes — list all active schemes
router.get('/', protect, async (req, res) => {
  const schemes = await Scheme.find({ isActive: true }).sort('-createdAt');
  res.json({ success: true, schemes });
});

// GET /api/schemes/my — my applications
router.get('/my', protect, async (req, res) => {
  const apps = await SchemeApplication.find({ user: req.user._id }).populate('scheme', 'name benefit category').sort('-createdAt');
  res.json({ success: true, applications: apps });
});

// POST /api/schemes/apply
router.post('/apply', protect, async (req, res) => {
  try {
    const { schemeId, applicantName, age, income, landAcres, bankAccount, ifsc, reason } = req.body;
    const scheme = await Scheme.findById(schemeId);
    if (!scheme) return res.status(404).json({ success: false, message: 'Scheme not found' });

    const existing = await SchemeApplication.findOne({ scheme: schemeId, user: req.user._id });
    if (existing) return res.status(400).json({ success: false, message: 'You have already applied for this scheme' });

    const app = await SchemeApplication.create({
      scheme: schemeId, user: req.user._id,
      applicantName, age: Number(age), income: Number(income),
      landAcres: landAcres ? Number(landAcres) : undefined,
      bankAccount, ifsc, reason
    });
    await app.populate('scheme', 'name benefit category');
    res.status(201).json({ success: true, message: 'Application submitted', application: app });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Admin: GET all applications
router.get('/admin/applications', protect, adminOnly, async (req, res) => {
  const apps = await SchemeApplication.find({})
    .populate('scheme', 'name benefit')
    .populate('user', 'name mobile village familyId')
    .sort('-createdAt');
  res.json({ success: true, applications: apps });
});

// Admin: update application status
router.patch('/admin/applications/:id', protect, adminOnly, async (req, res) => {
  const app = await SchemeApplication.findByIdAndUpdate(req.params.id,
    { status: req.body.status, adminNote: req.body.adminNote, ...(req.body.status === 'Approved' ? { approvedAt: new Date() } : {}) },
    { new: true }).populate('scheme','name').populate('user','name mobile');
  res.json({ success: true, application: app });
});

// Admin: create scheme
router.post('/admin', protect, adminOnly, async (req, res) => {
  try {
    const scheme = await Scheme.create(req.body);
    res.status(201).json({ success: true, scheme });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Admin: seed default schemes
router.post('/admin/seed', protect, adminOnly, async (req, res) => {
  const count = await Scheme.countDocuments();
  if (count > 0) return res.json({ success: true, message: 'Schemes already seeded' });
  const defaults = [
    { name: 'PM Awas Yojana', description: 'Subsidised housing assistance for rural BPL families', benefit: '₹1.2 Lakh grant', category: 'housing', eligibility: 'BPL family, no pucca house', maxIncome: 300000 },
    { name: 'MGNREGA', description: 'Guaranteed 100 days of wage employment per financial year', benefit: '₹220 per day', category: 'employment', eligibility: 'Adult member of rural household' },
    { name: 'PM Kisan Samman Nidhi', description: 'Income support for small and marginal farmers', benefit: '₹6,000 per year', category: 'agriculture', eligibility: 'Land-owning farmer family', maxIncome: 200000 },
    { name: 'Ayushman Bharat', description: 'Free health insurance coverage for poor families', benefit: '₹5 Lakh health cover', category: 'health', eligibility: 'SECC database listed family' },
    { name: 'PM Ujjwala Yojana', description: 'Free LPG connection for BPL women', benefit: 'Free LPG connection + refill subsidy', category: 'other', eligibility: 'BPL women above 18', maxIncome: 100000 },
  ];
  await Scheme.insertMany(defaults);
  res.json({ success: true, message: '5 default schemes seeded' });
});

module.exports = router;
