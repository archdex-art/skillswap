const Match = require('../models/Match');
const User = require('../models/User');
const { analyzeIntent, matchSkills } = require('../services/nlpService');

// ── Cooldown Config ───────────────────────────────────────────────────────────
const COOLDOWN_MAX    = 5;    // max requests per window
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
    const windowAge   = windowStart ? (now - windowStart) / 60000 : Infinity; // minutes

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
      requester.requestCooldown.count       = 1;
      requester.requestCooldown.windowStart = now;
    }
    await requester.save();

    // ── Duplicate / Active Request Check ───────────────────────────────────
    const existingMatch = await Match.findOne({
      $or: [
        { requester: req.user._id, recipient: recipientId },
        { requester: recipientId, recipient: req.user._id },
      ],
      status: { $in: ['pending', 'accepted'] },
      expiresAt: { $gt: now },
    });

    if (existingMatch) {
      return res.status(400).json({
        message: existingMatch.status === 'accepted'
          ? 'You are already connected with this user.'
          : 'A pending request already exists with this user.',
      });
    }

    // ── NLP: Intent Detection ───────────────────────────────────────────────
    const intentData = analyzeIntent(message || '');

    // ── Calculate Match Score and Tag ───────────────────────────────────────
    const recipient = await User.findById(recipientId);
    const iWantTheyOffer = matchSkills(requester.skillsWanted, recipient.skillsOffered || []);
    const theyWantIOffer = matchSkills(requester.skillsOffered, recipient.skillsWanted || []);
    const skillOverlapScore = (iWantTheyOffer.score + theyWantIOffer.score) / 2;
    const trustNorm = (recipient.trustScore || 50) / 100;
    
    const matchScore = Math.round((skillOverlapScore * 75) + (trustNorm * 25));
    let matchTag;
    if (matchScore >= 85) matchTag = 'Perfect Match';
    else if (matchScore >= 70) matchTag = 'Great Match';
    else if (matchScore >= 50) matchTag = 'Good Match';
    else matchTag = 'Average Match';

    // ── Create Match ────────────────────────────────────────────────────────
    const match = await Match.create({
      requester:  req.user._id,
      recipient:  recipientId,
      message:    message || '',
      intentData,
      matchScore,
      matchTag,
    });

    const populated = await Match.findById(match._id)
      .populate('requester', POPULATE_FIELDS)
      .populate('recipient', POPULATE_FIELDS);

    // ── Real-Time Notification → Recipient ─────────────────────────────────
    emitNotification(req.app.get('io'), recipientId, {
      type:    'new_request',
      title:   'New Skill Swap Request',
      body:    `${req.user.name} wants to swap skills with you!`,
      matchId: match._id.toString(),
      urgency: intentData.urgency,
    });

    res.status(201).json(populated);
  } catch (error) {
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
      recipientUser.acceptedCount    += 1;
      recipientUser.receivedCount    += 1;
      recipientUser.acceptanceRate    = recipientUser.acceptedCount / recipientUser.receivedCount;
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
        type:    'request_accepted',
        title:   'Request Accepted! 🎉',
        body:    `${req.user.name} accepted your skill swap request!`,
        matchId: match._id.toString(),
      });
      // Auto-open chat for both parties
      io?.to(`user:${match.requester.toString()}`).emit('open_chat', { matchId: match._id.toString() });
      io?.to(`user:${req.user._id.toString()}`).emit('open_chat',   { matchId: match._id.toString() });
    } else {
      emitNotification(io, match.requester.toString(), {
        type:    'request_rejected',
        title:   'Request Declined',
        body:    `${req.user.name} declined your skill swap request.`,
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
      $or: [
        { requester: req.user._id },
        { recipient: req.user._id },
      ],
      $or: [
        { status: { $in: ['accepted', 'completed'] } },               // always visible
        { status: 'pending', expiresAt: { $gt: now } },               // only non-expired pending
        { status: 'rejected' },                                        // show rejected in sent tab
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
      type:    'session_scheduled',
      title:   'Session Scheduled 📅',
      body:    `${req.user.name} scheduled your session for ${date} at ${time}.`,
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

    match.status      = 'completed';
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
