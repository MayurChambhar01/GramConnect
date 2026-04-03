const express = require('express');
const router = express.Router();
const Asset = require('../models/AssetReport');
const { protect, adminOnly } = require('../middleware/auth');

// GET all assets (public-ish)
router.get('/', protect, async (req, res) => {
  const assets = await Asset.find().sort('-createdAt').populate('reports.user','name');
  res.json({ success: true, assets });
});

// POST create asset (admin)
router.post('/', protect, adminOnly, async (req, res) => {
  const asset = await Asset.create(req.body);
  res.status(201).json({ success: true, asset });
});

// POST report issue on asset (villager)
router.post('/:id/report', protect, async (req, res) => {
  const { issue, photo } = req.body;
  const asset = await Asset.findById(req.params.id);
  if (!asset) return res.status(404).json({ success: false, message: 'Asset not found' });
  asset.reports.push({ user: req.user._id, issue, photo, reportedAt: new Date() });
  if (asset.status === 'Good') asset.status = 'Needs Repair';
  await asset.save();
  res.json({ success: true, message: 'Issue reported!' });
});

// PATCH update asset status (admin)
router.patch('/:id', protect, adminOnly, async (req, res) => {
  const asset = await Asset.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json({ success: true, asset });
});

// DELETE asset (admin)
router.delete('/:id', protect, adminOnly, async (req, res) => {
  await Asset.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

module.exports = router;
