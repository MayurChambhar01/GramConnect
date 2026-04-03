// ──────────────────── CERTIFICATES ────────────────────
const express = require('express');
const router = express.Router();
const Certificate = require('../models/Certificate');
const Tax = require('../models/Tax');
const { SOS, Notification } = require('../models/SOSNotification');
const { protect, adminOnly } = require('../middleware/auth');

// GET my certificates
router.get('/my', protect, async (req, res) => {
  const certs = await Certificate.find({ user: req.user._id }).sort('-createdAt');
  res.json({ success: true, certificates: certs });
});

// POST apply
router.post('/', protect, async (req, res) => {
  try {
    const cert = await Certificate.create({ ...req.body, user: req.user._id });
    res.status(201).json({ success: true, certificate: cert });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Admin: GET all
router.get('/', protect, adminOnly, async (req, res) => {
  const certs = await Certificate.find({}).populate('user','name mobile village').sort('-createdAt');
  res.json({ success: true, certificates: certs });
});

// Admin: update status
router.patch('/:id/status', protect, adminOnly, async (req, res) => {
  const cert = await Certificate.findByIdAndUpdate(req.params.id,
    { status: req.body.status, adminNote: req.body.adminNote, issuedDate: req.body.status === 'Approved' ? new Date() : undefined },
    { new: true });
  res.json({ success: true, certificate: cert });
});

module.exports.certificates = router;

// ──────────────────── TAXES ────────────────────
const taxRouter = express.Router();

taxRouter.get('/my', protect, async (req, res) => {
  const taxes = await Tax.find({ user: req.user._id }).sort('-createdAt');
  res.json({ success: true, taxes });
});

taxRouter.post('/pay/:id', protect, async (req, res) => {
  try {
    const { paymentMethod, upiId } = req.body;
    const txnId = 'TXN-' + Date.now();
    const tax = await Tax.findByIdAndUpdate(req.params.id,
      { status: 'Paid', transactionId: txnId, paymentMethod, paidAt: new Date() },
      { new: true });
    if (!tax) return res.status(404).json({ success: false, message: 'Tax record not found' });
    res.json({ success: true, message: 'Payment successful', transactionId: txnId, tax });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

taxRouter.get('/', protect, adminOnly, async (req, res) => {
  const taxes = await Tax.find({}).populate('user','name mobile village').sort('-createdAt');
  res.json({ success: true, taxes });
});

taxRouter.post('/', protect, adminOnly, async (req, res) => {
  try {
    const tax = await Tax.create(req.body);
    res.status(201).json({ success: true, tax });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports.taxes = taxRouter;

// ──────────────────── SOS ────────────────────
const sosRouter = express.Router();

sosRouter.post('/', protect, async (req, res) => {
  try {
    const sos = await SOS.create({ ...req.body, user: req.user._id });
    res.status(201).json({ success: true, message: 'SOS sent', sos });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

sosRouter.get('/', protect, adminOnly, async (req, res) => {
  const alerts = await SOS.find({ status: { $ne: 'Resolved' } })
    .populate('user','name mobile village address').sort('-createdAt');
  res.json({ success: true, alerts });
});

sosRouter.patch('/:id/resolve', protect, adminOnly, async (req, res) => {
  const sos = await SOS.findByIdAndUpdate(req.params.id,
    { status: 'Resolved', resolvedBy: req.user._id, resolvedAt: new Date() }, { new: true });
  res.json({ success: true, sos });
});

module.exports.sos = sosRouter;

// ──────────────────── NOTIFICATIONS ────────────────────
const notifRouter = express.Router();

notifRouter.get('/', protect, async (req, res) => {
  const notifs = await Notification.find({}).sort('-createdAt').limit(50);
  res.json({ success: true, notifications: notifs });
});

notifRouter.post('/', protect, adminOnly, async (req, res) => {
  try {
    const notif = await Notification.create({ ...req.body, sentBy: req.user._id });
    res.status(201).json({ success: true, notification: notif });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports.notifications = notifRouter;

// ──────────────────── CERTIFICATE PDF DOWNLOAD ────────────────────
const { protect: _protect2 } = require('./certificates') || {};
// Add PDF download route to certificates router
const router_certs = require('./certificates');

// Note: certificate PDF is served from the main combined router
const certPdfRouter = express.Router();
certPdfRouter.get('/pdf/:id', require('../middleware/auth').protect, async (req, res) => {
  try {
    const cert = await Certificate.findById(req.params.id).populate('user','name mobile village familyId');
    if (!cert) return res.status(404).json({ success:false, message:'Certificate not found' });
    if (cert.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin')
      return res.status(403).json({ success:false, message:'Forbidden' });

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Certificate</title>
    <style>body{font-family:Arial,sans-serif;max-width:650px;margin:40px auto;color:#333;}
    .header{background:#1A3A2A;color:#fff;padding:28px 32px;text-align:center;border-radius:8px 8px 0 0;}
    .header h1{margin:0;font-size:24px;letter-spacing:2px;}.sub{font-size:13px;opacity:.8;margin-top:4px;}
    .cert-no{text-align:center;padding:14px;background:#f9f9f9;font-size:12px;color:#666;letter-spacing:1px;}
    .body{padding:30px;border:1px solid #ddd;border-top:none;border-radius:0 0 8px 8px;}
    .type{text-align:center;font-size:28px;font-weight:700;color:#1A3A2A;text-transform:uppercase;letter-spacing:3px;padding:20px 0;border-bottom:2px solid #C9962A;}
    .cert-text{font-size:14px;line-height:1.8;margin:20px 0;text-align:justify;}
    table{width:100%;margin:20px 0;}td{padding:10px;border-bottom:1px solid #eee;}td:first-child{font-weight:600;width:40%;color:#555;}
    .seal{text-align:center;padding:20px;}.badge{background:#dcfce7;color:#15803d;padding:4px 14px;border-radius:20px;font-weight:700;}
    .signature{display:flex;justify-content:space-between;margin-top:30px;padding-top:20px;border-top:1px solid #ddd;}
    .sig-box{text-align:center;}.sig-line{width:150px;height:1px;background:#333;margin:30px auto 8px;}
    @media print{body{margin:0;}.no-print{display:none;}}</style></head>
    <body>
    <div class="header"><h1>🏡 GramSeva — Gram Panchayat</h1><div class="sub">Official Government Certificate</div></div>
    <div class="cert-no">Certificate No: ${cert.applicationId} &nbsp;|&nbsp; Status: <span class="badge">${cert.status?.toUpperCase()}</span></div>
    <div class="body">
    <div class="type">${cert.type} Certificate</div>
    <div class="cert-text">
    This is to certify that <strong>${cert.user.name}</strong>, resident of Village <strong>${cert.user.village}</strong>,
    bearing Family ID <strong>${cert.user.familyId}</strong>, having Mobile No. <strong>${cert.user.mobile}</strong>,
    has applied for the <strong>${cert.type?.charAt(0).toUpperCase()+cert.type?.slice(1)} Certificate</strong>.
    ${cert.status === 'Approved' ? `This certificate has been duly verified and approved by the Gram Panchayat authorities.` : `This application is currently under review.`}
    </div>
    <table>
      <tr><td>Certificate Type</td><td style="text-transform:capitalize">${cert.type}</td></tr>
      <tr><td>Application ID</td><td>${cert.applicationId}</td></tr>
      <tr><td>Applicant Name</td><td>${cert.user.name}</td></tr>
      <tr><td>Village</td><td>${cert.user.village}</td></tr>
      <tr><td>Purpose</td><td>${cert.purpose || 'General Purpose'}</td></tr>
      <tr><td>Applied On</td><td>${new Date(cert.createdAt).toLocaleDateString('en-IN')}</td></tr>
      <tr><td>Status</td><td><span class="badge">${cert.status}</span></td></tr>
      ${cert.issuedDate ? `<tr><td>Issued On</td><td>${new Date(cert.issuedDate).toLocaleDateString('en-IN')}</td></tr>` : ''}
    </table>
    <div class="signature">
      <div class="sig-box"><div class="sig-line"></div><div style="font-size:12px;color:#555">Applicant Signature</div><div style="font-size:11px;color:#888;margin-top:4px">${cert.user.name}</div></div>
      <div class="seal"><div style="font-size:48px">🏛️</div><div style="font-size:11px;color:#1A3A2A;font-weight:700">GRAM PANCHAYAT SEAL</div></div>
      <div class="sig-box"><div class="sig-line"></div><div style="font-size:12px;color:#555">Panchayat Secretary</div><div style="font-size:11px;color:#888;margin-top:4px">Authorised Signatory</div></div>
    </div>
    </div>
    <div style="text-align:center;margin-top:16px;font-size:11px;color:#999">
    Computer generated certificate. Valid subject to verification. &nbsp;|&nbsp; GramSeva Portal &nbsp;|&nbsp;
    <button class="no-print" onclick="window.print()" style="margin-left:10px;padding:5px 14px;background:#1A3A2A;color:#fff;border:none;border-radius:5px;cursor:pointer;font-size:11px;">🖨 Print</button>
    </div></body></html>`;

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch(err) { res.status(500).json({ success:false, message:err.message }); }
});

module.exports.certPdf = certPdfRouter;
