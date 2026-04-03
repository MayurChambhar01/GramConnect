const mongoose = require('mongoose');

const marketListingSchema = new mongoose.Schema({
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sellerName: { type: String, required: true },
  sellerVillage: { type: String },
  sellerMobile: { type: String },
  product: { type: String, required: true, trim: true },
  category: {
    type: String,
    enum: ['grain', 'vegetable', 'fruit', 'pulse', 'oilseed', 'spice', 'dairy', 'other'],
    default: 'other'
  },
  quantity: { type: Number, required: true },
  unit: { type: String, default: 'kg', enum: ['kg', 'quintal', 'ton', 'litre', 'dozen', 'piece'] },
  pricePerUnit: { type: Number, required: true },
  minOrderQty: { type: Number, default: 1 },
  description: { type: String, default: '' },
  harvestDate: { type: Date },
  availableTill: { type: Date },
  isOrganic: { type: Boolean, default: false },
  status: { type: String, enum: ['active', 'sold', 'expired'], default: 'active' },
  images: [String],
  location: { type: String },
  gpsLat: { type: Number },
  gpsLong: { type: Number },
  views: { type: Number, default: 0 },
  inquiries: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('MarketListing', marketListingSchema);
