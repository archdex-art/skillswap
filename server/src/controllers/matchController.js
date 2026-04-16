const Match = require('../models/Match');
const User = require('../models/User');
const { analyzeIntent, matchSkills } = require('../services/nlpService');
const { computeSimilarity } = require('../services/embeddingService');
const logger = require('../utils/logger');

// ── Cooldown Config ───────────────────────────────────────────────────────────
const COOLDOWN_MAX = 5;    // max requests per window
const COOLDOWN_WINDOW = 30;   // minutes

// ── Shared populate fields ────────────────────────────────────────────────────
const POPULATE_FIELDS = 'name avatar skillsOffered skillsWanted trustScore';

/**
 * Emit a notification to a specific user via their personal socket room.
 * @param {object} io        - Socket.io server instance (attached to app)
 * @param {string} userId    - Target user's MongoDB _id as string
 * @param {object} payload   - Notification payload
 */
function emitNotification(io, userId, payload) {
  if (io) {
    io.to(`user:${userId}`).emit('notification', payload);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Request a match with optional message
// @route   POST /api/matches
// @access  Private
// ─────────────────────────────────────────────────────────────────────────────
const requestMatch = async (req, res) => {
  try {
    const { recipientId, message } = req.body;

    // Self-match guard
    if (req.user._id.toString() === recipientId) {
      return res.status(400).json({ message: 'Cannot match with yourself' });
    }

    // ── Cooldown Check ──────────────────────────────────────────────────────
    const now = new Date();
    const requester = await User.findById(req.user._id);
    const cd = requester.requestCooldown;
    const windowStart = cd.windowStart ? new Date(cd.windowStart) : null;
    const windowAge = windowStart ? (now - windowStart) / 60000 : Infinity; // minutes

    if (windowStart && windowAge < COOLDOWN_WINDOW) {
      if (cd.count >= COOLDOWN_MAX) {
        const waitMin = Math.ceil(COOLDOWN_WINDOW - windowAge);
        return res.status(429).json({
          message: `Too many requests. Please wait ${waitMin} minute(s) before sending more.`,
        });
      }
      requester.requestCooldown.count += 1;
    } else {
      // Reset window
      requester.requestCooldown.count = 1;
      requester.requestCooldown.windowStart = now;
    }
    await requester.save();

    // ── Duplicate / Active Request Check ───────────────────────────────────
    // Check for ANY existing match between these two users (any status)
    const existingMatch = await Match.findOne({
      $or: [
        { requester: req.user._id, recipient: recipientId },
        { requester: recipientId, recipient: req.user._id },
      ],
    });

    if (existingMatch) {
      if (existingMatch.status === 'accepted') {
        return res.status(400).json({ message: 'You are already connected with this user.' });
      }
      if (existingMatch.status === 'pending' && existingMatch.expiresAt > now) {
        return res.status(400).json({ message: 'A pending request already exists with this user.' });
      }
      // Expired or rejected — delete stale record so we can create a fresh one
      await Match.deleteOne({ _id: existingMatch._id });
    }

    // ── NLP: Intent Detection ───────────────────────────────────────────────
    const intentData = analyzeIntent(message || '');

    // ── Calculate Semantic Match Score ──────────────────────────────────────
    const recipient = await User.findById(recipientId);

    let matchScore = 50; // Default fallback
    let matchTag = 'Average Match';
    let semanticDetails = {};

    try {
      // Use semantic similarity if NLP service is available
      const similarity = await computeSimilarity(
        requester.skillsWanted || [],
        requester.skillsOffered || [],
        recipient.skillsOffered || [],
        recipient.skillsWanted || []
      );

      const semanticScore = similarity.final_score * 100;
      const trustNorm = (recipient.trustScore || 50) / 100;

      matchScore = Math.round((semanticScore * 0.75) + (trustNorm * 25));
      semanticDetails = {
        semanticScore: Math.round(semanticScore),
        userWantsMatch: Math.round(similarity.user_wants_target_offers * 100),
        targetWantsMatch: Math.round(similarity.target_wants_user_offers * 100),
        trustScore: Math.round(trustNorm * 100),
      };

      logger.info(`✅ Semantic match score: ${matchScore} for ${requester._id} → ${recipientId}`);
    } catch (error) {
      // Fallback to keyword-based matching if NLP service fails
      logger.warn(`⚠️ NLP service unavailable, falling back to keyword matching: ${error.message}`);
      const iWantTheyOffer = matchSkills(requester.skillsWanted, recipient.skillsOffered || []);
      const theyWantIOffer = matchSkills(requester.skillsOffered, recipient.skillsWanted || []);
      const skillOverlapScore = (iWantTheyOffer.score + theyWantIOffer.score) / 2;
      const trustNorm = (recipient.trustScore || 50) / 100;

      matchScore = Math.round((skillOverlapScore * 75) + (trustNorm * 25));
      semanticDetails = {
        method: 'keyword_fallback',
        skillOverlap: Math.round(skillOverlapScore * 100),
      };
    }

    // Determine match tag based on score
    if (matchScore >= 85) matchTag = 'Perfect Match';
    else if (matchScore >= 70) matchTag = 'Great Match';
    else if (matchScore >= 50) matchTag = 'Good Match';
    else matchTag = 'Average Match';

    // ── Create Match ────────────────────────────────────────────────────────
    const match = await Match.create({
      requester: req.user._id,
      recipient: recipientId,
      message: message || '',
      intentData,
      matchScore,
      matchTag,
      semanticDetails,
    });

    const populated = await Match.findById(match._id)
      .populate('requester', POPULATE_FIELDS)
      .populate('recipient', POPULATE_FIELDS);

    // ── Real-Time Notification → Recipient ─────────────────────────────────
    emitNotification(req.app.get('io'), recipientId, {
      type: 'new_request',
      title: 'New Skill Swap Request',
      body: `${req.user.name} wants to swap skills with you!`,
      matchId: match._id.toString(),
      urgency: intentData.urgency,
    });

    res.status(201).json(populated);
  } catch (error) {
    // E11000: duplicate key — a match document already exists for this pair
    if (error.code === 11000) {
      return res.status(400).json({
        message: 'You have already sent a request to this user.',
      });
    }
    res.status(500).json({ message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Accept or reject an incoming match request
// @route   PUT /api/matches/:id
// @access  Private
// ─────────────────────────────────────────────────────────────────────────────
const respondToMatch = async (req, res) => {
  try {
    const { status } = req.body;

    if (!['accepted', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }

    const match = await Match.findById(req.params.id);
    if (!match) return res.status(404).json({ message: 'Match not found' });

    if (match.recipient.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to respond to this request' });
    }

    // Check not expired
    if (match.expiresAt < new Date() && match.status === 'pending') {
      match.status = 'expired';
      await match.save();
      return res.status(400).json({ message: 'This request has expired.' });
    }

    match.status = status;
    await match.save();

    // ── Trust Score Updates ─────────────────────────────────────────────────
    if (status === 'accepted') {
      const recipientUser = await User.findById(req.user._id);
      recipientUser.acceptedCount += 1;
      recipientUser.receivedCount += 1;
      recipientUser.acceptanceRate = recipientUser.acceptedCount / recipientUser.receivedCount;
      recipientUser.recalculateTrustScore();
      await recipientUser.save();
    } else if (status === 'rejected') {
      const recipientUser = await User.findById(req.user._id);
      recipientUser.receivedCount += 1;
      recipientUser.acceptanceRate = recipientUser.acceptedCount / recipientUser.receivedCount;
      recipientUser.recalculateTrustScore();
      await recipientUser.save();
    }

    const populated = await Match.findById(match._id)
      .populate('requester', POPULATE_FIELDS)
      .populate('recipient', POPULATE_FIELDS);

    const io = req.app.get('io');

    // ── Real-Time Notification → Requester ─────────────────────────────────
    if (status === 'accepted') {
      emitNotification(io, match.requester.toString(), {
        type: 'request_accepted',
        title: 'Request Accepted! 🎉',
        body: `${req.user.name} accepted your skill swap request!`,
        matchId: match._id.toString(),
      });
      // Auto-open chat for both parties
      io?.to(`user:${match.requester.toString()}`).emit('open_chat', { matchId: match._id.toString() });
      io?.to(`user:${req.user._id.toString()}`).emit('open_chat', { matchId: match._id.toString() });
    } else {
      emitNotification(io, match.requester.toString(), {
        type: 'request_rejected',
        title: 'Request Declined',
        body: `${req.user.name} declined your skill swap request.`,
        matchId: match._id.toString(),
      });
    }

    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Get all user requests (non-expired pending + all accepted/completed)
// @route   GET /api/matches
// @access  Private
// ─────────────────────────────────────────────────────────────────────────────
const getMatches = async (req, res) => {
  try {
    const now = new Date();
    const matches = await Match.find({
      // Must involve this user
      $and: [
        {
          $or: [
            { requester: req.user._id },
            { recipient: req.user._id },
          ],
        },
        {
          // Show active/completed always; pending if not expired; rejected for history
          $or: [
            { status: { $in: ['accepted', 'completed'] } },
            { status: 'pending', expiresAt: { $gt: now } },
            { status: 'rejected' },
          ],
        },
      ],
    })
      .populate('requester', `${POPULATE_FIELDS} bio location`)
      .populate('recipient', `${POPULATE_FIELDS} bio location`)
      .sort({ createdAt: -1 });

    res.json(matches);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Schedule a session after request is accepted
// @route   PUT /api/matches/:id/schedule
// @access  Private
// ─────────────────────────────────────────────────────────────────────────────
const scheduleSession = async (req, res) => {
  try {
    const { date, time, mode } = req.body;
    const match = await Match.findById(req.params.id);

    if (!match) return res.status(404).json({ message: 'Match not found' });
    if (match.status !== 'accepted') {
      return res.status(400).json({ message: 'Can only schedule an accepted match.' });
    }

    const isParty = [match.requester.toString(), match.recipient.toString()]
      .includes(req.user._id.toString());
    if (!isParty) return res.status(403).json({ message: 'Not authorized' });

    match.schedule = { date, time, mode: mode || 'online' };
    await match.save();

    const populated = await Match.findById(match._id)
      .populate('requester', POPULATE_FIELDS)
      .populate('recipient', POPULATE_FIELDS);

    const io = req.app.get('io');
    const otherId = match.requester.toString() === req.user._id.toString()
      ? match.recipient.toString()
      : match.requester.toString();

    emitNotification(io, otherId, {
      type: 'session_scheduled',
      title: 'Session Scheduled 📅',
      body: `${req.user.name} scheduled your session for ${date} at ${time}.`,
      matchId: match._id.toString(),
    });

    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Mark a match as completed
// @route   PUT /api/matches/:id/complete
// @access  Private
// ─────────────────────────────────────────────────────────────────────────────
const completeMatch = async (req, res) => {
  try {
    const match = await Match.findById(req.params.id);
    if (!match) return res.status(404).json({ message: 'Match not found' });
    if (match.status !== 'accepted') {
      return res.status(400).json({ message: 'Only accepted matches can be completed.' });
    }

    const isParty = [match.requester.toString(), match.recipient.toString()]
      .includes(req.user._id.toString());
    if (!isParty) return res.status(403).json({ message: 'Not authorized' });

    match.status = 'completed';
    match.completedAt = new Date();
    await match.save();

    // Update both users
    await Promise.all([
      User.findById(match.requester).then(async u => {
        u.completedCount += 1;
        u.recalculateTrustScore();
        return u.save();
      }),
      User.findById(match.recipient).then(async u => {
        u.completedCount += 1;
        u.recalculateTrustScore();
        return u.save();
      }),
    ]);

    const populated = await Match.findById(match._id)
      .populate('requester', POPULATE_FIELDS)
      .populate('recipient', POPULATE_FIELDS);

    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  requestMatch,
  respondToMatch,
  getMatches,
  scheduleSession,
  completeMatch,
};
