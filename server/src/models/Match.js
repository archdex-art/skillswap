const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema({
  requester: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
  // Custom message sent with the request
  message: { type: String, default: '' },
}, { timestamps: true });

const Match = mongoose.model('Match', matchSchema);
module.exports = Match;
