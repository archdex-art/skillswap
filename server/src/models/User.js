const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  bio: { type: String, default: '' },
  avatar: { type: String, default: '' },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] }, // [longitude, latitude]
  },

  // ── Skills ──────────────────────────────────────────────────────────────
  rawSkillsOfferedInput: { type: String, default: '' }, // original free text
  rawSkillsWantedInput:  { type: String, default: '' },
  skillsOffered:         [{ type: String }],             // NLP-normalized
  skillsWanted:          [{ type: String }],             // NLP-normalized
  availability:          { type: String, default: 'Flexible' },

  // ── Trust Score Components ───────────────────────────────────────────────
  trustScore:      { type: Number, default: 50 },  // computed, stored for fast queries
  acceptedCount:   { type: Number, default: 0 },   // times this user accepted a request
  completedCount:  { type: Number, default: 0 },   // completed skill exchanges
  totalRating:     { type: Number, default: 0 },   // sum of all received ratings
  ratingCount:     { type: Number, default: 0 },   // number of ratings received
  acceptanceRate:  { type: Number, default: 0 },   // accepted / totalReceived (0–1)
  receivedCount:   { type: Number, default: 0 },   // total incoming requests received

  // ── Request Cooldown ─────────────────────────────────────────────────────
  requestCooldown: {
    count:       { type: Number, default: 0 },
    windowStart: { type: Date, default: null },
  },
}, { timestamps: true });

// Geospatial index
userSchema.index({ location: '2dsphere' });

// ── Trust Score Helper ────────────────────────────────────────────────────────
/**
 * Recalculates and saves trustScore based on:
 *   avgRating    × 0.60
 *   completedCount (×5 pts each, capped at 20) × 0.25
 *   acceptanceRate × 0.15
 */
userSchema.methods.recalculateTrustScore = function () {
  const avgRating = this.ratingCount > 0
    ? (this.totalRating / this.ratingCount)   // 1–5 scale
    : 3;                                       // neutral default (50/100)

  const ratingComponent     = ((avgRating - 1) / 4) * 100 * 0.60;        // 0-60
  const completedComponent  = Math.min(this.completedCount * 5, 20) * 0.25 * 4; // 0-20
  const acceptanceComponent = (this.acceptanceRate || 0) * 100 * 0.15;   // 0-15

  this.trustScore = Math.round(
    Math.min(100, Math.max(0, ratingComponent + completedComponent + acceptanceComponent))
  );
};

// ── Password Helpers ──────────────────────────────────────────────────────────
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

const User = mongoose.model('User', userSchema);
module.exports = User;
