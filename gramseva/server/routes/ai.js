/**
 * GramSeva AI Bridge Route
 * Proxies requests to the Python AI microservice on port 6000.
 * 
 * Routes:
 *   POST /api/ai/face/register     – register villager face
 *   POST /api/ai/face/verify       – identify face for attendance
 *   GET  /api/ai/face/list         – list registered faces
 *   DELETE /api/ai/face/:userId    – remove face data
 *   POST /api/ai/complaint/check   – fake complaint image check
 *   GET  /api/ai/health            – AI service health check
 */
const express = require('express');
const router  = express.Router();
const { protect, adminOnly: admin } = require('../middleware/auth');

const AI_URL = process.env.AI_SERVICE_URL || 'http://localhost:6000';

async function proxyToAI(path, method, body) {
  try {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (body) opts.body = JSON.stringify(body);

    const res  = await fetch(`${AI_URL}${path}`, opts);
    const data = await res.json();
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    console.error('AI service error:', err.message);
    return {
      ok: false,
      status: 503,
      data: {
        success: false,
        message: 'AI service is not running. Start it with: python3 ai-service/app.py',
        error: err.message,
      },
    };
  }
}

/* ── Face Registration (Admin only) ── */
router.post('/face/register', protect, admin, async (req, res) => {
  const { userId, name, images } = req.body;
  if (!userId || !images?.length)
    return res.status(400).json({ success: false, message: 'userId and images[] are required' });

  const { data, status } = await proxyToAI('/face/register', 'POST', { userId, name, images });
  res.status(status).json(data);
});

/* ── Face Verify for Attendance ── */
router.post('/face/verify', protect, async (req, res) => {
  const { image, requireLiveness } = req.body;
  if (!image)
    return res.status(400).json({ success: false, message: 'image is required' });

  const { data, status } = await proxyToAI('/face/verify', 'POST', { image, requireLiveness });

  // If matched, also mark attendance in DB
  if (data.matched && data.userId) {
    try {
      const Sabha = require('mongoose').model('GramSabha') || null;
      // Optionally log attendance here
    } catch (_) {}
  }

  res.status(status).json(data);
});

/* ── List registered faces (Admin) ── */
router.get('/face/list', protect, admin, async (req, res) => {
  const { data, status } = await proxyToAI('/face/list', 'GET');
  res.status(status).json(data);
});

/* ── Delete face data (Admin) ── */
router.delete('/face/:userId', protect, admin, async (req, res) => {
  const { data, status } = await proxyToAI(`/face/delete/${req.params.userId}`, 'DELETE');
  res.status(status).json(data);
});

/* ── Check complaint image for fakes ── */
router.post('/complaint/check', protect, async (req, res) => {
  const { image, complaintId, save } = req.body;
  if (!image)
    return res.status(400).json({ success: false, message: 'image is required' });

  const userId = req.user._id?.toString();
  const { data, status } = await proxyToAI('/complaint/check', 'POST', {
    image, complaintId, userId, save: save !== false
  });
  res.status(status).json(data);
});

/* ── Health check ── */
router.get('/health', async (req, res) => {
  const { data, status } = await proxyToAI('/health', 'GET');
  res.status(status).json(data);
});

module.exports = router;
