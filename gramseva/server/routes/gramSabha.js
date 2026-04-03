const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');
const path = require('path');
const fs = require('fs');

// In-memory store for meetings (use MongoDB model in production)
let meetings = [
  {
    _id: 'mtg-001',
    date: '2026-03-15',
    time: '10:00 AM – 1:00 PM',
    venue: 'Village Community Hall, Rajpur',
    agenda: 'Annual Budget Review & Road Works',
    attendees: []
  }
];
let attendanceRecords = [];

// GET /api/gram-sabha/upcoming
router.get('/upcoming', protect, async (req, res) => {
  res.json({ success: true, meetings });
});

// GET /api/gram-sabha/attendance/my
router.get('/attendance/my', protect, async (req, res) => {
  const records = attendanceRecords.filter(r => r.userId === req.user._id.toString());
  res.json({ success: true, attendance: records });
});

// POST /api/gram-sabha/attend  — mark attendance with photo + GPS
router.post('/attend', protect, (req, res, next) => { req.uploadFolder = 'sabha'; next(); },
  upload.single('photo'), async (req, res) => {
  try {
    const { meetingId, gpsLat, gpsLong, gpsLocation } = req.body;

    const record = {
      _id: 'att-' + Date.now(),
      userId: req.user._id.toString(),
      userName: req.user.name,
      meetingId: meetingId || 'mtg-001',
      timestamp: new Date().toISOString(),
      gpsLat: gpsLat ? parseFloat(gpsLat) : null,
      gpsLong: gpsLong ? parseFloat(gpsLong) : null,
      gpsLocation: gpsLocation || 'Location not captured',
      photoPath: req.file ? req.file.path : null,
      photoUrl: req.file ? `/uploads/${path.basename(path.dirname(req.file.path))}/${req.file.filename}` : null,
      verified: true
    };

    attendanceRecords.push(record);

    // Add to meeting attendees
    const meeting = meetings.find(m => m._id === (meetingId || 'mtg-001'));
    if (meeting) {
      meeting.attendees = meeting.attendees.filter(a => a.userId !== req.user._id.toString());
      meeting.attendees.push({ userId: req.user._id.toString(), name: req.user.name, time: record.timestamp });
    }

    res.json({
      success: true,
      message: '✅ Attendance marked successfully!',
      record,
      attendeeCount: meeting?.attendees?.length || 1
    });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Admin: GET all attendance
router.get('/admin/attendance', protect, async (req, res) => {
  res.json({ success: true, attendance: attendanceRecords, meetings });
});

module.exports = router;
