const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const upload = require('../middleware/upload');
const User = require('../models/User');
const LiveCapture = require('../models/LiveCapture');
const {
  uploadBufferToBlob,
  sendRemoteFile,
  deleteBlobByUrl,
} = require('../utils/blob');

router.post('/upload', protect, (req, res, next) => { req.uploadFolder = 'documents'; next(); },
  upload.single('file'), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
      const uploaded = await uploadBufferToBlob('documents', req.file);
      res.json({
        success: true,
        path: uploaded.url,
        filename: uploaded.filename,
        originalName: uploaded.originalName,
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

router.get('/view/:folder/:filename', protect, async (req, res) => {
  try {
    const suffix = `/${req.params.folder}/${req.params.filename}`;
    const user = await User.findOne({ documentPath: { $regex: `${req.params.filename}$` } })
      .select('documentPath documentOriginalName');
    if (!user?.documentPath || !user.documentPath.includes(`/${req.params.folder}/`)) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }
    return sendRemoteFile(res, user.documentPath, user.documentOriginalName || req.params.filename, false);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/download/:folder/:filename', protect, async (req, res) => {
  try {
    const user = await User.findOne({ documentPath: { $regex: `${req.params.filename}$` } })
      .select('documentPath documentOriginalName');
    if (!user?.documentPath || !user.documentPath.includes(`/${req.params.folder}/`)) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }
    return sendRemoteFile(res, user.documentPath, user.documentOriginalName || req.params.filename, true);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/admin/all', protect, adminOnly, async (req, res) => {
  try {
    const users = await User.find({ role: 'villager', documentPath: { $exists: true, $ne: null } })
      .select('name mobile village documentPath documentOriginalName documentType familyId createdAt');
    const docs = users.map((u) => ({
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
      downloadUrl: `/api/documents/user-doc/${u._id}?download=1`,
    }));
    res.json({ success: true, documents: docs, total: docs.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/user-doc/:userId', protect, adminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select('documentPath documentOriginalName name');
    if (!user || !user.documentPath) return res.status(404).json({ success: false, message: 'No document found for this user' });
    return sendRemoteFile(
      res,
      user.documentPath,
      user.documentOriginalName || user.name || 'document',
      req.query.download === '1'
    );
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/upload-photo', protect,
  (req, res, next) => { req.uploadFolder = 'live-captures'; next(); },
  upload.single('photo'),
  async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ success: false, message: 'No photo uploaded' });
      const uploaded = await uploadBufferToBlob('live-captures', req.file);
      const { purpose, lat, lng, accuracy, timestamp } = req.body;
      const mapsLink = (lat && lng) ? `https://www.google.com/maps?q=${lat},${lng}` : null;

      const capture = await LiveCapture.create({
        user: req.user._id,
        purpose: purpose || 'record',
        filename: uploaded.filename,
        filePath: uploaded.url,
        lat: lat ? parseFloat(lat) : undefined,
        lng: lng ? parseFloat(lng) : undefined,
        accuracy: accuracy ? parseFloat(accuracy) : undefined,
        timestamp: timestamp || new Date().toISOString(),
        mapsLink,
      });

      res.json({
        success: true,
        message: 'Photo saved successfully',
        captureId: capture._id,
        viewUrl: `/api/documents/live-captures/${capture._id}/photo`,
        mapsLink,
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

router.get('/live-captures', protect, adminOnly, async (req, res) => {
  try {
    const captures = await LiveCapture.find({})
      .populate('user', 'name mobile village familyId')
      .sort('-createdAt')
      .limit(500);

    const results = captures.map((c) => ({
      _id: c._id,
      user: c.user,
      purpose: c.purpose,
      filename: c.filename,
      lat: c.lat,
      lng: c.lng,
      accuracy: c.accuracy,
      timestamp: c.timestamp,
      mapsLink: c.mapsLink,
      viewUrl: `/api/documents/live-captures/${c._id}/photo`,
      createdAt: c.createdAt,
    }));

    res.json({ success: true, captures: results, total: results.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/live-captures/:id/photo', protect, async (req, res) => {
  try {
    const capture = await LiveCapture.findById(req.params.id).populate('user', '_id');
    if (!capture) return res.status(404).json({ success: false, message: 'Photo not found' });

    const isAdmin = req.user.role === 'admin';
    const isOwner = capture.user?._id?.toString() === req.user._id.toString();
    if (!isAdmin && !isOwner) return res.status(403).json({ success: false, message: 'Access denied' });

    return sendRemoteFile(res, capture.filePath, capture.filename || 'photo.jpg', false);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/live-captures/:id', protect, adminOnly, async (req, res) => {
  try {
    const capture = await LiveCapture.findByIdAndDelete(req.params.id);
    if (!capture) return res.status(404).json({ success: false, message: 'Not found' });
    await deleteBlobByUrl(capture.filePath);
    res.json({ success: true, message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
