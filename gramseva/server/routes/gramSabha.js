const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { uploadBufferToBlob } = require('../utils/blob');

let meetings = [
  {
    _id: 'mtg-001',
    date: '2026-03-15',
    time: '10:00 AM - 1:00 PM',
    venue: 'Village Community Hall, Rajpur',
    agenda: 'Annual Budget Review & Road Works',
    attendees: [],
  },
];
let attendanceRecords = [];

router.get('/upcoming', protect, async (req, res) => {
  res.json({ success: true, meetings });
});

router.get('/attendance/my', protect, async (req, res) => {
  const records = attendanceRecords.filter((r) => r.userId === req.user._id.toString());
  res.json({ success: true, attendance: records });
});

router.post('/attend', protect, (req, res, next) => { req.uploadFolder = 'sabha'; next(); },
  upload.single('photo'), async (req, res) => {
    try {
      const { meetingId, gpsLat, gpsLong, gpsLocation } = req.body;
      const uploadedPhoto = req.file ? await uploadBufferToBlob('sabha', req.file) : null;

      const record = {
        _id: 'att-' + Date.now(),
        userId: req.user._id.toString(),
        userName: req.user.name,
        meetingId: meetingId || 'mtg-001',
        timestamp: new Date().toISOString(),
        gpsLat: gpsLat ? parseFloat(gpsLat) : null,
        gpsLong: gpsLong ? parseFloat(gpsLong) : null,
        gpsLocation: gpsLocation || 'Location not captured',
        photoPath: uploadedPhoto ? uploadedPhoto.url : null,
        photoUrl: uploadedPhoto ? uploadedPhoto.url : null,
        verified: true,
      };

      attendanceRecords.push(record);

      const meeting = meetings.find((m) => m._id === (meetingId || 'mtg-001'));
      if (meeting) {
        meeting.attendees = meeting.attendees.filter((a) => a.userId !== req.user._id.toString());
        meeting.attendees.push({ userId: req.user._id.toString(), name: req.user.name, time: record.timestamp });
      }

      res.json({
        success: true,
        message: 'Attendance marked successfully!',
        record,
        attendeeCount: meeting?.attendees?.length || 1,
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

router.get('/admin/attendance', protect, async (req, res) => {
  res.json({ success: true, attendance: attendanceRecords, meetings });
});

module.exports = router;
