const mongoose = require('mongoose');

const VoteSchema = new mongoose.Schema({
  user:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  option: { type: Number, required: true }, // index into options[]
  votedAt:{ type: Date, default: Date.now }
});

const PollSchema = new mongoose.Schema({
  title:       { type: String, required: true },
  description: { type: String, default: '' },
  options:     [{ label: String, description: String }],
  category:    { type: String, enum: ['budget','infrastructure','welfare','event','other'], default: 'other' },
  meetingId:   { type: String, default: '' },
  startDate:   { type: Date, default: Date.now },
  endDate:     { type: Date, required: true },
  isActive:    { type: Boolean, default: true },
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  votes:       [VoteSchema],
  createdAt:   { type: Date, default: Date.now }
});

PollSchema.virtual('totalVotes').get(function(){ return this.votes.length; });
PollSchema.virtual('results').get(function(){
  return this.options.map((opt, i) => ({
    label: opt.label, description: opt.description,
    count: this.votes.filter(v => v.option === i).length
  }));
});

module.exports = mongoose.model('VotingPoll', PollSchema);
