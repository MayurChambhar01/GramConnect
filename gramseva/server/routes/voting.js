const express = require('express');
const router = express.Router();
const Poll = require('../models/VotingPoll');
const { protect, adminOnly } = require('../middleware/auth');

// GET all active polls
router.get('/', protect, async (req, res) => {
  const polls = await Poll.find({ isActive: true }).sort('-createdAt').lean();
  const result = polls.map(p => {
    const total = p.votes.length;
    const userVote = p.votes.find(v => v.user.toString() === req.user._id.toString());
    const results = p.options.map((opt, i) => ({
      label: opt.label, description: opt.description || '',
      count: p.votes.filter(v => v.option === i).length,
      pct: total ? Math.round((p.votes.filter(v => v.option === i).length / total) * 100) : 0
    }));
    return { ...p, totalVotes: total, results, userVoted: !!userVote, userOption: userVote?.option ?? null };
  });
  res.json({ success: true, polls: result });
});

// GET all polls (admin)
router.get('/all', protect, adminOnly, async (req, res) => {
  const polls = await Poll.find().sort('-createdAt').lean();
  res.json({ success: true, polls: polls.map(p => ({ ...p, totalVotes: p.votes.length })) });
});

// POST vote
router.post('/:id/vote', protect, async (req, res) => {
  const { option } = req.body;
  const poll = await Poll.findById(req.params.id);
  if (!poll || !poll.isActive) return res.status(400).json({ success: false, message: 'Poll not active' });
  if (new Date() > poll.endDate) return res.status(400).json({ success: false, message: 'Poll has ended' });
  if (option === undefined || option < 0 || option >= poll.options.length)
    return res.status(400).json({ success: false, message: 'Invalid option' });
  const already = poll.votes.find(v => v.user.toString() === req.user._id.toString());
  if (already) return res.status(400).json({ success: false, message: 'You have already voted' });
  poll.votes.push({ user: req.user._id, option });
  await poll.save();
  const total = poll.votes.length;
  const results = poll.options.map((opt, i) => ({
    label: opt.label, count: poll.votes.filter(v => v.option === i).length,
    pct: Math.round((poll.votes.filter(v => v.option === i).length / total) * 100)
  }));
  res.json({ success: true, message: 'Vote recorded!', results, totalVotes: total });
});

// POST create poll (admin)
router.post('/', protect, adminOnly, async (req, res) => {
  const poll = await Poll.create({ ...req.body, createdBy: req.user._id });
  res.status(201).json({ success: true, poll });
});

// PATCH close poll (admin)
router.patch('/:id/close', protect, adminOnly, async (req, res) => {
  const poll = await Poll.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  res.json({ success: true, poll });
});

// DELETE poll (admin)
router.delete('/:id', protect, adminOnly, async (req, res) => {
  await Poll.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

module.exports = router;
