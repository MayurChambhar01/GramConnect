const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// GET /api/families/my
router.get('/my', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({ success:true, family: user });
  } catch(err) { res.status(500).json({ success:false, message:err.message }); }
});

// POST /api/families/members — add member (FIXED)
router.post('/members', protect, async (req, res) => {
  try {
    const { name, aadhaarLast4, age, gender, relation } = req.body;
    if (!name) return res.status(400).json({ success:false, message:'Member name is required' });
    const user = await User.findById(req.user._id);
    user.familyMembers.push({ name, aadhaarLast4, age: Number(age)||0, gender, relation });
    await user.save();
    res.json({ success:true, message:'Member added successfully', members: user.familyMembers });
  } catch(err) { res.status(500).json({ success:false, message:err.message }); }
});

// DELETE /api/families/members/:memberId
router.delete('/members/:memberId', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const before = user.familyMembers.length;
    user.familyMembers = user.familyMembers.filter(m => m._id.toString() !== req.params.memberId);
    if (user.familyMembers.length === before) return res.status(404).json({ success:false, message:'Member not found' });
    await user.save();
    res.json({ success:true, message:'Member removed', members: user.familyMembers });
  } catch(err) { res.status(500).json({ success:false, message:err.message }); }
});

// PATCH /api/families/access-controls
router.patch('/access-controls', protect, async (req, res) => {
  try {
    const { allowMembersViewRecords, requireHeadApproval, freezeAllMemberAccess } = req.body;
    const user = await User.findById(req.user._id);
    if (allowMembersViewRecords !== undefined) user.allowMembersViewRecords = allowMembersViewRecords;
    if (requireHeadApproval !== undefined) user.requireHeadApproval = requireHeadApproval;
    if (freezeAllMemberAccess !== undefined) user.freezeAllMemberAccess = freezeAllMemberAccess;
    await user.save();
    res.json({ success:true, message:'Access controls updated' });
  } catch(err) { res.status(500).json({ success:false, message:err.message }); }
});

// PATCH /api/families/members/:memberId/freeze
router.patch('/members/:memberId/freeze', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const member = user.familyMembers.id(req.params.memberId);
    if (!member) return res.status(404).json({ success:false, message:'Member not found' });
    member.accessFrozen = !member.accessFrozen;
    await user.save();
    res.json({ success:true, message:`Member access ${member.accessFrozen?'frozen':'restored'}`, frozen: member.accessFrozen });
  } catch(err) { res.status(500).json({ success:false, message:err.message }); }
});

module.exports = router;
