const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema({
  requester: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'completed', 'expired'],
    default: 'pending',
  },
  message: { type: String, default: '' },

  // ── NLP: Intent Analysis ─────────────────────────────────────────────────
  intentData: {
    urgency:    { type: String, enum: ['low', 'medium', 'high'], default: 'low' },
    intentType: { type: String, enum: ['learning', 'teaching', 'collaboration', 'general'], default: 'general' },
    priority:   { type: Number, default: 4 },  // 1 = highest, 4 = lowest
  },

  // ── Smart Match Data ──────────────────────────────────────────────────────
  matchScore: { type: Number, default: 0 },
  matchTag:   { type: String, default: '' },
  semanticDetails: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
    description: 'Detailed semantic matching information',
  },

  // ── Scheduling ────────────────────────────────────────────────────────────
  schedule: {
    date: { type: String, default: null },
    time: { type: String, default: null },
    mode: { type: String, enum: ['online', 'offline'], default: 'online' },
  },

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  expiresAt:   { type: Date, default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
  completedAt: { type: Date, default: null },
}, { timestamps: true });

// Index for fast expiry queries
matchSchema.index({ expiresAt: 1 });
matchSchema.index({ requester: 1, recipient: 1 });

const Match = mongoose.model('Match', matchSchema);
module.exports = Match;
