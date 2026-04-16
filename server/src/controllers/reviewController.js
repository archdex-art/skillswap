const Review = require('../models/Review');
const Match = require('../models/Match');
const User = require('../models/User');

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Submit a review after a completed skill exchange
// @route   POST /api/reviews
// @access  Private
// ─────────────────────────────────────────────────────────────────────────────
const createReview = async (req, res) => {
  try {
    const { matchId, rating, comment } = req.body;

    if (!matchId || !rating || !comment) {
      return res.status(400).json({ message: 'matchId, rating, and comment are required' });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    const match = await Match.findById(matchId);
    if (!match) return res.status(404).json({ message: 'Match not found' });
    if (match.status !== 'completed') {
      return res.status(400).json({ message: 'Can only review a completed match' });
    }

    const reviewerId = req.user._id.toString();
    const isParty = [match.requester.toString(), match.recipient.toString()].includes(reviewerId);
    if (!isParty) return res.status(403).json({ message: 'Not authorized to review this match' });

    // Determine who is being reviewed (the other party)
    const revieweeId = match.requester.toString() === reviewerId
      ? match.recipient
      : match.requester;

    // Prevent duplicate review for the same match by the same reviewer
    const existing = await Review.findOne({ matchId, reviewerId });
    if (existing) return res.status(400).json({ message: 'You have already reviewed this exchange' });

    const review = await Review.create({ reviewerId, revieweeId, matchId, rating, comment });

    // ── Recalculate Reviewee's Trust Score ──────────────────────────────────
    const reviewee = await User.findById(revieweeId);
    reviewee.totalRating += rating;
    reviewee.ratingCount += 1;
    reviewee.recalculateTrustScore();
    await reviewee.save();

    res.status(201).json({
      review,
      updatedTrustScore: reviewee.trustScore,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Get all reviews for a user
// @route   GET /api/reviews/:userId
// @access  Private
// ─────────────────────────────────────────────────────────────────────────────
const getReviewsForUser = async (req, res) => {
  try {
    const reviews = await Review.find({ revieweeId: req.params.userId })
      .populate('reviewerId', 'name avatar')
      .sort({ createdAt: -1 });
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { createReview, getReviewsForUser };
