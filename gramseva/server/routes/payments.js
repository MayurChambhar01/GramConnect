const express = require('express');
const router = express.Router();
const Payment = require('../models/Payment');
const Tax = require('../models/Tax');
const { protect, adminOnly } = require('../middleware/auth');

// GET /api/payments/my
router.get('/my', protect, async (req, res) => {
  const payments = await Payment.find({ user: req.user._id }).populate('tax', 'type dueDate').sort('-createdAt');
  res.json({ success: true, payments });
});

// POST /api/payments/create-order  — Razorpay integration
router.post('/create-order', protect, async (req, res) => {
  try {
    const { taxId, amount, method } = req.body;

    // If Razorpay configured, create real order
    if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
      const Razorpay = require('razorpay');
      const razorpay = new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });
      const order = await razorpay.orders.create({ amount: amount * 100, currency: 'INR', receipt: `tax_${taxId}_${Date.now()}` });
      return res.json({ success: true, orderId: order.id, key: process.env.RAZORPAY_KEY_ID, amount: order.amount });
    }

    // Demo fallback
    res.json({ success: true, orderId: 'DEMO-' + Date.now(), key: 'rzp_test_demo', amount: amount * 100, demo: true });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// POST /api/payments/confirm  — confirm and save payment + update tax
router.post('/confirm', protect, async (req, res) => {
  try {
    const { taxId, amount, method, upiId, razorpayOrderId, razorpayPaymentId, description } = req.body;

    // Update tax status
    if (taxId && taxId !== 'manual') {
      await Tax.findByIdAndUpdate(taxId, {
        status: 'Paid', paidAt: new Date(),
        transactionId: razorpayPaymentId || 'DEMO-' + Date.now(),
        paymentMethod: method
      });
    }

    const payment = await Payment.create({
      user: req.user._id, tax: taxId && taxId !== 'manual' ? taxId : undefined,
      amount, method, upiId: upiId || '', description,
      razorpayOrderId, razorpayPaymentId,
      status: 'Success'
    });

    res.json({ success: true, message: 'Payment recorded', payment, receiptNumber: payment.receiptNumber });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// GET /api/payments/receipt/:id  — downloadable receipt HTML
router.get('/receipt/:id', protect, async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id).populate('user', 'name mobile village familyId').populate('tax', 'type');
    if (!payment) return res.status(404).json({ success: false, message: 'Receipt not found' });
    if (payment.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin')
      return res.status(403).json({ success: false, message: 'Forbidden' });

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Payment Receipt</title>
    <style>body{font-family:Arial,sans-serif;max-width:600px;margin:40px auto;color:#333;}
    .header{background:#1A3A2A;color:#fff;padding:24px;text-align:center;border-radius:8px 8px 0 0;}
    .header h1{margin:0;font-size:22px;}table{width:100%;border-collapse:collapse;margin:20px 0;}
    td{padding:12px;border-bottom:1px solid #eee;}td:first-child{font-weight:600;width:40%;}
    .amount{font-size:28px;font-weight:700;color:#1A3A2A;text-align:center;padding:20px;}
    .footer{background:#f9f9f9;padding:16px;text-align:center;font-size:12px;color:#666;border-radius:0 0 8px 8px;}
    .badge{background:#dcfce7;color:#15803d;padding:4px 12px;border-radius:20px;font-weight:600;}
    @media print{body{margin:0;}</style></head>
    <body>
    <div class="header"><h1>🏡 GramSeva — Payment Receipt</h1><p>Gram Panchayat Official Receipt</p></div>
    <div class="amount">₹${payment.amount.toLocaleString('en-IN')} <span class="badge">PAID ✓</span></div>
    <table>
      <tr><td>Receipt Number</td><td><strong>${payment.receiptNumber}</strong></td></tr>
      <tr><td>Payment ID</td><td>${payment.paymentId}</td></tr>
      <tr><td>Payer Name</td><td>${payment.user.name}</td></tr>
      <tr><td>Mobile</td><td>${payment.user.mobile}</td></tr>
      <tr><td>Family ID</td><td>${payment.user.familyId}</td></tr>
      <tr><td>Village</td><td>${payment.user.village}</td></tr>
      <tr><td>Payment Type</td><td>${payment.tax?.type || payment.description || 'Tax Payment'}</td></tr>
      <tr><td>Amount Paid</td><td>₹${payment.amount.toLocaleString('en-IN')}</td></tr>
      <tr><td>Payment Method</td><td>${payment.method}</td></tr>
      <tr><td>Date & Time</td><td>${new Date(payment.createdAt).toLocaleString('en-IN')}</td></tr>
      <tr><td>Status</td><td><span class="badge">SUCCESS</span></td></tr>
    </table>
    <div class="footer">
      This is a computer-generated receipt. No signature required.<br>
      For queries contact: Gram Panchayat Office | gramseva@village.gov.in<br>
      <button onclick="window.print()" style="margin-top:12px;padding:8px 20px;background:#1A3A2A;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:13px;">🖨 Print Receipt</button>
    </div></body></html>`;

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Admin: all payments
router.get('/', protect, adminOnly, async (req, res) => {
  const payments = await Payment.find({}).populate('user', 'name mobile village').sort('-createdAt').limit(100);
  res.json({ success: true, payments });
});

module.exports = router;
