const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const FamilyMemberSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  aadhaarLast4: { type: String, maxlength: 4 },
  age: { type: Number },
  gender: { type: String, enum: ['Male','Female','Other'] },
  relation: { type: String },
  accessFrozen: { type: Boolean, default: false },
  addedAt: { type: Date, default: Date.now }
});

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  aadhaarNumber: { type: String, required: true, unique: true, trim: true },
  age: { type: Number, required: true },
  gender: { type: String, enum: ['Male','Female','Other'], required: true },
  mobile: { type: String, required: true, unique: true, trim: true },
  address: { type: String, required: true },
  village: { type: String, required: true, trim: true },
  pincode: { type: String, required: true, trim: true },
  password: { type: String, required: true, minlength: 6, select: false },
  role: { type: String, enum: ['villager','admin'], default: 'villager' },
  documentType: { type: String, enum: ['aadhaar','ration','voter'], default: 'aadhaar' },
  documentPath: { type: String, default: '' },
  documentOriginalName: { type: String, default: '' },
  familyPin: { type: String, select: false },
  securityQuestion: { type: String, default: '' },
  securityAnswer: { type: String, default: '', select: false },
  familyMembers: [FamilyMemberSchema],
  allowMembersViewRecords: { type: Boolean, default: true },
  requireHeadApproval: { type: Boolean, default: true },
  freezeAllMemberAccess: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  familyId: { type: String, unique: true, sparse: true },
  lastLogin: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

UserSchema.pre('save', async function(next) {
  if (this.isNew && !this.familyId) {
    this.familyId = 'FAM-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substr(2,4).toUpperCase();
  }
  if (this.isModified('password')) this.password = await bcrypt.hash(this.password, 12);
  if (this.isModified('familyPin') && this.familyPin) this.familyPin = await bcrypt.hash(this.familyPin, 10);
  if (this.isModified('securityAnswer') && this.securityAnswer) this.securityAnswer = await bcrypt.hash(this.securityAnswer.toLowerCase(), 10);
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('User', UserSchema);
