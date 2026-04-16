/**
 * Recommendation Controller
 * 
 * Handles semantic skill matching and user recommendations using NLP embeddings
 */

const User = require('../models/User');
const Match = require('../models/Match');
const { getRecommendations, computeSimilarity, generateEmbeddings } = require('../services/embeddingService');
const logger = require('../utils/logger');

const POPULATE_FIELDS = 'name avatar skillsOffered skillsWanted trustScore location availability bio completedCount ratingCount';

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Get semantic recommendations for a user
// @route   GET /api/recommendations/:userId
// @access  Private
// ─────────────────────────────────────────────────────────────────────────────
const getSemanticRecommendations = async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 20, excludeMatched = true } = req.query;

    // Verify user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Authorization check
    if (req.user._id.toString() !== userId) {
      return res.status(403).json({ message: 'Not authorized to view recommendations for this user' });
    }

    logger.info(`📊 Generating recommendations for user ${userId}`);

    // Fetch all other users
    let query = { _id: { $ne: userId } };

    // Optionally exclude users with active matches
    if (excludeMatched === 'true' || excludeMatched === true) {
      const activeMatches = await Match.find({
        $or: [
          { requester: userId, status: { $in: ['pending', 'accepted'] } },
          { recipient: userId, status: { $in: ['pending', 'accepted'] } },
        ],
      }).select('requester recipient');

      const excludeIds = activeMatches.flatMap(m => [
        m.requester.toString(),
        m.recipient.toString(),
      ]);

      if (excludeIds.length > 0) {
        query._id.$nin = excludeIds;
      }
    }

    const candidates = await User.find(query)
      .select('skillsOffered skillsWanted trustScore location availability bio completedCount ratingCount')
      .limit(500); // Reasonable limit to avoid timeout

    if (candidates.length === 0) {
      return res.status(200).json({
        message: 'No candidates available',
        recommendations: [],
        total: 0,
      });
    }

    // Prepare candidate data for NLP service
    const candidateData = candidates.map(c => ({
      user_id: c._id.toString(),
      skills_offered: c.skillsOffered || [],
      skills_wanted: c.skillsWanted || [],
    }));

    // Call NLP service for semantic recommendations
    const nlpResult = await getRecommendations(
      userId,
      user.skillsWanted || [],
      user.skillsOffered || [],
      candidateData
    );

    // Enrich recommendations with full user data
    const enrichedRecommendations = await Promise.all(
      nlpResult.recommendations.slice(0, parseInt(limit)).map(async (rec) => {
        const fullUser = await User.findById(rec.user_id).select(POPULATE_FIELDS);
        return {
          ...rec,
          user: fullUser ? {
            _id: fullUser._id,
            name: fullUser.name,
            avatar: fullUser.avatar,
            bio: fullUser.bio,
            trustScore: fullUser.trustScore,
            completedCount: fullUser.completedCount,
            ratingCount: fullUser.ratingCount,
            location: fullUser.location,
            availability: fullUser.availability,
          } : null,
        };
      })
    );

    logger.info(`✅ Generated ${enrichedRecommendations.length} recommendations`);

    res.status(200).json({
      message: 'Recommendations generated successfully',
      recommendations: enrichedRecommendations,
      total: enrichedRecommendations.length,
      explanation: {
        semantic_match_score: 'Cosine similarity between skills (0-1 range)',
        user_wants_match: 'How much of user\'s desired skills are covered by this match',
        target_wants_match: 'How much of target\'s desired skills can be covered by user',
      },
    });
  } catch (error) {
    logger.error('❌ Error in getSemanticRecommendations:', error.message);
    res.status(500).json({
      message: 'Failed to generate recommendations',
      error: error.message,
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Compute semantic match score between two users
// @route   POST /api/recommendations/score
// @access  Private
// ─────────────────────────────────────────────────────────────────────────────
const computeMatchScore = async (req, res) => {
  try {
    const { userId, targetId } = req.body;

    if (!userId || !targetId) {
      return res.status(400).json({ message: 'userId and targetId are required' });
    }

    if (userId === targetId) {
      return res.status(400).json({ message: 'Cannot compute score with self' });
    }

    const user = await User.findById(userId);
    const target = await User.findById(targetId);

    if (!user || !target) {
      return res.status(404).json({ message: 'One or both users not found' });
    }

    // Compute semantic similarity
    const similarityData = await computeSimilarity(
      user.skillsWanted || [],
      user.skillsOffered || [],
      target.skillsOffered || [],
      target.skillsWanted || []
    );

    // Combine with trust score (25% trust, 75% semantic match)
    const semanticScore = similarityData.final_score * 100;
    const trustNorm = (target.trustScore || 50) / 100;
    const finalScore = Math.round((semanticScore * 0.75) + (trustNorm * 25));

    let matchTag = 'Average Match';
    if (finalScore >= 85) matchTag = 'Perfect Match';
    else if (finalScore >= 70) matchTag = 'Great Match';
    else if (finalScore >= 50) matchTag = 'Good Match';

    logger.info(`✅ Match score computed: ${finalScore}`);

    res.status(200).json({
      userId,
      targetId,
      semantic_match_score: Math.round(similarityData.final_score * 100),
      trust_component: Math.round(trustNorm * 100),
      final_match_score: finalScore,
      match_tag: matchTag,
      details: {
        user_wants_target_offers: Math.round(similarityData.user_wants_target_offers * 100),
        target_wants_user_offers: Math.round(similarityData.target_wants_user_offers * 100),
        explanation: similarityData.explanation,
      },
    });
  } catch (error) {
    logger.error('❌ Error in computeMatchScore:', error.message);
    res.status(500).json({
      message: 'Failed to compute match score',
      error: error.message,
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Refresh embeddings for a user
// @route   POST /api/recommendations/refresh-embeddings/:userId
// @access  Private
// ─────────────────────────────────────────────────────────────────────────────
const refreshUserEmbeddings = async (req, res) => {
  try {
    const { userId } = req.params;

    if (req.user._id.toString() !== userId) {
      return res.status(403).json({ message: 'Not authorized to refresh embeddings for this user' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    logger.info(`🔄 Refreshing embeddings for user ${userId}`);

    // Generate embeddings for offered and wanted skills
    let embeddingOffered = [];
    let embeddingWanted = [];

    if (user.skillsOffered && user.skillsOffered.length > 0) {
      const offered = await generateEmbeddings(user.skillsOffered);
      // Average the embeddings for all offered skills
      embeddingOffered = averageEmbeddings(offered);
    }

    if (user.skillsWanted && user.skillsWanted.length > 0) {
      const wanted = await generateEmbeddings(user.skillsWanted);
      // Average the embeddings for all wanted skills
      embeddingWanted = averageEmbeddings(wanted);
    }

    user.embeddingOffered = embeddingOffered;
    user.embeddingWanted = embeddingWanted;
    user.embeddingUpdatedAt = new Date();
    await user.save();

    logger.info(`✅ Embeddings refreshed for user ${userId}`);

    res.status(200).json({
      message: 'Embeddings refreshed successfully',
      userId,
      embeddingOfferedDim: embeddingOffered.length,
      embeddingWantedDim: embeddingWanted.length,
      updatedAt: user.embeddingUpdatedAt,
    });
  } catch (error) {
    logger.error('❌ Error in refreshUserEmbeddings:', error.message);
    res.status(500).json({
      message: 'Failed to refresh embeddings',
      error: error.message,
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Utility: Average Embeddings
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Average multiple embeddings into a single embedding
 * Useful for representing a group of skills as a single vector
 * 
 * @param {number[][]} embeddings - 2D array of embeddings
 * @returns {number[]} - Averaged 1D embedding
 */
function averageEmbeddings(embeddings) {
  if (!embeddings || embeddings.length === 0) return [];

  const dimension = embeddings[0].length;
  const averaged = new Array(dimension).fill(0);

  embeddings.forEach(embedding => {
    embedding.forEach((val, idx) => {
      averaged[idx] += val;
    });
  });

  return averaged.map(val => val / embeddings.length);
}

module.exports = {
  getSemanticRecommendations,
  computeMatchScore,
  refreshUserEmbeddings,
};
