const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const MarketListing = require('../models/MarketListing');

// Mandi (government market) reference prices — updated periodically in real systems
// These are demo MSP/mandi prices based on typical Indian market rates
const MANDI_PRICES = [
  { product: 'Wheat',       category: 'grain',     price: 2275, unit: 'quintal', trend: 'up',   change: 2.1 },
  { product: 'Rice',        category: 'grain',     price: 2183, unit: 'quintal', trend: 'stable',change: 0.3 },
  { product: 'Maize',       category: 'grain',     price: 2090, unit: 'quintal', trend: 'down', change: -1.2 },
  { product: 'Soybean',     category: 'oilseed',   price: 4892, unit: 'quintal', trend: 'up',   change: 3.4 },
  { product: 'Groundnut',   category: 'oilseed',   price: 6783, unit: 'quintal', trend: 'up',   change: 1.8 },
  { product: 'Mustard',     category: 'oilseed',   price: 5650, unit: 'quintal', trend: 'stable',change: 0.5 },
  { product: 'Onion',       category: 'vegetable', price: 1800, unit: 'quintal', trend: 'down', change: -4.2 },
  { product: 'Tomato',      category: 'vegetable', price: 2400, unit: 'quintal', trend: 'up',   change: 8.3 },
  { product: 'Potato',      category: 'vegetable', price: 1200, unit: 'quintal', trend: 'stable',change: -0.8 },
  { product: 'Chilli',      category: 'spice',     price: 9500, unit: 'quintal', trend: 'up',   change: 5.1 },
  { product: 'Turmeric',    category: 'spice',     price: 14000,unit: 'quintal', trend: 'up',   change: 6.7 },
  { product: 'Tur Dal',     category: 'pulse',     price: 7000, unit: 'quintal', trend: 'stable',change: 1.1 },
  { product: 'Chana',       category: 'pulse',     price: 5440, unit: 'quintal', trend: 'down', change: -0.9 },
  { product: 'Moong',       category: 'pulse',     price: 8558, unit: 'quintal', trend: 'up',   change: 2.6 },
  { product: 'Banana',      category: 'fruit',     price: 2200, unit: 'quintal', trend: 'stable',change: 0.2 },
  { product: 'Mango',       category: 'fruit',     price: 4500, unit: 'quintal', trend: 'up',   change: 12.0 },
  { product: 'Milk',        category: 'dairy',     price: 54,   unit: 'litre',   trend: 'up',   change: 1.5 },
  { product: 'Sugarcane',   category: 'grain',     price: 3150, unit: 'ton',     trend: 'stable',change: 0.0 },
];

// GET /api/marketplace/mandi-prices
router.get('/mandi-prices', protect, (req, res) => {
  const { category } = req.query;
  let prices = MANDI_PRICES;
  if (category && category !== 'all') {
    prices = prices.filter(p => p.category === category);
  }
  res.json({ success: true, prices, updatedAt: new Date() });
});

// GET /api/marketplace/listings — all active listings
router.get('/listings', protect, async (req, res) => {
  try {
    const { category, product, page = 1, limit = 20 } = req.query;
    const query = { status: 'active' };
    if (category && category !== 'all') query.category = category;
    if (product) query.product = { $regex: product, $options: 'i' };

    const listings = await MarketListing.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    res.json({ success: true, listings });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// GET /api/marketplace/my — my listings
router.get('/my', protect, async (req, res) => {
  try {
    const listings = await MarketListing.find({ seller: req.user.id }).sort({ createdAt: -1 }).lean();
    res.json({ success: true, listings });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// POST /api/marketplace — create listing
router.post('/', protect, async (req, res) => {
  try {
    const { product, category, quantity, unit, pricePerUnit, minOrderQty, description, harvestDate, availableTill, isOrganic, location, gpsLat, gpsLong } = req.body;

    if (!product || !quantity || !pricePerUnit) {
      return res.status(400).json({ success: false, message: 'Product, quantity, and price are required' });
    }

    const listing = await MarketListing.create({
      seller: req.user.id,
      sellerName: req.user.name,
      sellerVillage: req.user.village,
      sellerMobile: req.user.mobile,
      product, category, quantity: Number(quantity), unit,
      pricePerUnit: Number(pricePerUnit),
      minOrderQty: Number(minOrderQty) || 1,
      description, harvestDate, availableTill,
      isOrganic: Boolean(isOrganic),
      location, gpsLat, gpsLong,
    });

    res.status(201).json({ success: true, listing, message: 'Listing created successfully' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// PATCH /api/marketplace/:id/status — mark sold/active
router.patch('/:id/status', protect, async (req, res) => {
  try {
    const listing = await MarketListing.findOne({ _id: req.params.id, seller: req.user.id });
    if (!listing) return res.status(404).json({ success: false, message: 'Listing not found' });
    listing.status = req.body.status || 'sold';
    await listing.save();
    res.json({ success: true, message: 'Status updated' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// DELETE /api/marketplace/:id
router.delete('/:id',protect, async (req, res) => {
  try {
    await MarketListing.deleteOne({ _id: req.params.id, seller: req.user.id });
    res.json({ success: true, message: 'Listing removed' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// POST /api/marketplace/:id/inquire — increment inquiry count
router.post('/:id/inquire', protect, async (req, res) => {
  try {
    await MarketListing.findByIdAndUpdate(req.params.id, { $inc: { inquiries: 1 } });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

module.exports = router;
