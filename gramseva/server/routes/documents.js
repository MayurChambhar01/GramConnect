const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { protect, adminOnly } = require('../middleware/auth');
const upload = require('../middleware/upload');
const User = require('../models/User');

// POST /api/documents/upload
router.post('/upload', protect, (req, res, next) => { req.uploadFolder = 'documents'; next(); },
  upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ success:false, message:'No file uploaded' });
  res.json({ success:true, path:req.file.path, filename:req.file.filename, originalName:req.file.originalname });
});

// GET /api/documents/view/:filename  — view/download uploaded document
router.get('/view/:folder/:filename', protect, (req, res) => {
  const filePath = path.join(__dirname, '../uploads', req.params.folder, req.params.filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ success:false, message:'File not found' });
  const ext = path.extname(filePath).toLowerCase();
  const mime = ext === '.pdf' ? 'application/pdf' : ext === '.png' ? 'image/png' : 'image/jpeg';
  res.setHeader('Content-Type', mime);
  res.setHeader('Content-Disposition', `inline; filename="${req.params.filename}"`);
  fs.createReadStream(filePath).pipe(res);
});

// GET /api/documents/download/:folder/:filename  — force download
router.get('/download/:folder/:filename', protect, (req, res) => {
  const filePath = path.join(__dirname, '../uploads', req.params.folder, req.params.filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ success:false, message:'File not found' });
  res.download(filePath, req.params.filename);
});

// GET /api/documents/admin/all  — admin: get all uploaded user documents
router.get('/admin/all', protect, adminOnly, async (req, res) => {
  try {
    const users = await User.find({ role: 'villager', documentPath: { $exists: true, $ne: null } })
      .select('name mobile village documentPath documentOriginalName documentType familyId createdAt');
    const docs = users.map(u => ({
      _id: u._id,
      userId: u._id,
      userName: u.name,
      mobile: u.mobile,
      village: u.village,
      familyId: u.familyId,
      documentType: u.documentType || 'identity',
      originalName: u.documentOriginalName || 'Document',
      uploadedAt: u.createdAt,
      viewUrl: `/api/documents/user-doc/${u._id}`,
      downloadUrl: `/api/documents/user-doc/${u._id}?download=1`
    }));
    res.json({ success: true, documents: docs, total: docs.length });
  } catch(err) { res.status(500).json({ success:false, message:err.message }); }
});

// GET /api/documents/user-doc/:userId  with download param
router.get('/user-doc/:userId', protect, adminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select('documentPath documentOriginalName name');
    if (!user || !user.documentPath) return res.status(404).json({ success:false, message:'No document found for this user' });
    if (!fs.existsSync(user.documentPath)) return res.status(404).json({ success:false, message:'File not found on server' });
    const ext = path.extname(user.documentPath).toLowerCase();
    const mime = ext === '.pdf' ? 'application/pdf' : ext === '.png' ? 'image/png' : 'image/jpeg';
    if (req.query.download === '1') {
      res.setHeader('Content-Disposition', `attachment; filename="${user.documentOriginalName || user.name + ext}"`);
    } else {
      res.setHeader('Content-Disposition', `inline; filename="${user.documentOriginalName || user.name + ext}"`);
    }
    res.setHeader('Content-Type', mime);
    fs.createReadStream(user.documentPath).pipe(res);
  } catch(err) { res.status(500).json({ success:false, message:err.message }); }
});

module.exports = router;

// ─────────────────────────────────────────────────────────────
// LIVE PHOTO CAPTURE — POST /api/documents/upload-photo
// Villager captures a live photo with GPS; stored server-side.
// Admin can view all captures via GET /api/documents/live-captures
// ─────────────────────────────────────────────────────────────
const LiveCapture = require('../models/LiveCapture');

router.post('/upload-photo', protect,
  (req, res, next) => { req.uploadFolder = 'live-captures'; next(); },
  upload.single('photo'),
  async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ success: false, message: 'No photo uploaded' });
      const { purpose, lat, lng, accuracy, timestamp } = req.body;
      const mapsLink = (lat && lng) ? `https://www.google.com/maps?q=${lat},${lng}` : null;

      const capture = await LiveCapture.create({
        user:      req.user._id,
        purpose:   purpose || 'record',
        filename:  req.file.filename,
        filePath:  req.file.path,
        lat:       lat   ? parseFloat(lat)      : undefined,
        lng:       lng   ? parseFloat(lng)       : undefined,
        accuracy:  accuracy ? parseFloat(accuracy) : undefined,
        timestamp: timestamp || new Date().toISOString(),
        mapsLink,
      });

      res.json({
        success: true,
        message: 'Photo saved successfully',
        captureId: capture._id,
        viewUrl:   `/api/documents/live-captures/${capture._id}/photo`,
        mapsLink,
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// Admin: GET all live captures with user info
router.get('/live-captures', protect, adminOnly, async (req, res) => {
  try {
    const captures = await LiveCapture.find({})
      .populate('user', 'name mobile village familyId')
      .sort('-createdAt')
      .limit(500);

    const results = captures.map(c => ({
      _id:       c._id,
      user:      c.user,
      purpose:   c.purpose,
      filename:  c.filename,
      lat:       c.lat,
      lng:       c.lng,
      accuracy:  c.accuracy,
      timestamp: c.timestamp,
      mapsLink:  c.mapsLink,
      viewUrl:   `/api/documents/live-captures/${c._id}/photo`,
      createdAt: c.createdAt,
    }));

    res.json({ success: true, captures: results, total: results.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Admin/Villager: view a single capture photo
router.get('/live-captures/:id/photo', protect, async (req, res) => {
  try {
    const capture = await LiveCapture.findById(req.params.id).populate('user', '_id');
    if (!capture) return res.status(404).json({ success: false, message: 'Photo not found' });

    // Only allow admin or the owner to view
    const isAdmin  = req.user.role === 'admin';
    const isOwner  = capture.user?._id?.toString() === req.user._id.toString();
    if (!isAdmin && !isOwner) return res.status(403).json({ success: false, message: 'Access denied' });

    if (!fs.existsSync(capture.filePath))
      return res.status(404).json({ success: false, message: 'File not found on server' });

    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Content-Disposition', `inline; filename="${capture.filename}"`);
    fs.createReadStream(capture.filePath).pipe(res);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Admin: delete a capture
router.delete('/live-captures/:id', protect, adminOnly, async (req, res) => {
  try {
    const capture = await LiveCapture.findByIdAndDelete(req.params.id);
    if (!capture) return res.status(404).json({ success: false, message: 'Not found' });
    if (fs.existsSync(capture.filePath)) fs.unlinkSync(capture.filePath);
    res.json({ success: true, message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

