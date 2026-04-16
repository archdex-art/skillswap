const express = require('express');
const {
  getSemanticRecommendations,
  computeMatchScore,
  refreshUserEmbeddings,
} = require('../controllers/recommendationController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

/**
 * GET /api/recommendations/:userId
 * Get semantic recommendations for a specific user
 * Query params: limit (default 20), excludeMatched (default true)
 */
router.get('/:userId', protect, getSemanticRecommendations);

/**
 * POST /api/recommendations/score
 * Compute semantic match score between two users
 * Body: {userId, targetId}
 */
router.post('/score', protect, computeMatchScore);

/**
 * POST /api/recommendations/refresh-embeddings/:userId
 * Manually refresh semantic embeddings for a user
 * Triggered when skills are updated
 */
router.post('/refresh-embeddings/:userId', protect, refreshUserEmbeddings);

module.exports = router;
