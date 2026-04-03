const express = require('express');
const router = express.Router();
const Complaint = require('../models/Complaint');
const { protect, adminOnly } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { uploadManyToBlob } = require('../utils/blob');

router.get('/my', protect, async (req, res) => {
  try {
    const complaints = await Complaint.find({ user: req.user._id }).sort('-createdAt');
    res.json({ success: true, complaints });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/', protect, (req, res, next) => { req.uploadFolder = 'complaints'; next(); },
  upload.array('photos', 5), async (req, res) => {
    try {
      const { category, description, location, gpsLat, gpsLong } = req.body;
      const uploadedPhotos = req.files?.length ? await uploadManyToBlob('complaints', req.files) : [];
      const complaint = await Complaint.create({
        user: req.user._id,
        category,
        description,
        location,
        gpsLat: gpsLat ? Number(gpsLat) : undefined,
        gpsLong: gpsLong ? Number(gpsLong) : undefined,
        photos: uploadedPhotos.map((file) => file.url),
      });
      res.status(201).json({ success: true, message: 'Complaint filed', complaint });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

router.patch('/:id/rate', protect, async (req, res) => {
  try {
    const { rating } = req.body;
    const complaint = await Complaint.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id, status: 'Resolved' },
      { rating },
      { new: true }
    );
    if (!complaint) return res.status(404).json({ success: false, message: 'Complaint not found or not resolved' });
    res.json({ success: true, complaint });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const { status, category, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (category) filter.category = category;
    const complaints = await Complaint.find(filter)
      .populate('user', 'name mobile village familyId')
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(Number(limit));
    const total = await Complaint.countDocuments(filter);
    res.json({ success: true, complaints, total });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.patch('/:id/status', protect, adminOnly, async (req, res) => {
  try {
    const { status, adminNote } = req.body;
    const update = { status, adminNote };
    if (status === 'Resolved') update.resolvedAt = Date.now();
    const complaint = await Complaint.findByIdAndUpdate(req.params.id, update, { new: true });
    res.json({ success: true, complaint });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
