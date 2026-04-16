/**
 * Embedding Service
 * 
 * Communicates with the Python NLP microservice to:
 * - Generate embeddings for skill texts
 * - Compute semantic similarity
 * - Get recommendations
 */

const axios = require('axios');
const logger = require('../utils/logger');

// Configuration
const NLP_SERVICE_URL = process.env.NLP_SERVICE_URL || 'http://localhost:8000';
const TIMEOUT = 30000; // 30 seconds

// ──────────────────────────────────────────────────────────────────────────────
// HTTP Client Setup
// ──────────────────────────────────────────────────────────────────────────────

const nlpClient = axios.create({
  baseURL: NLP_SERVICE_URL,
  timeout: TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Error interceptor
nlpClient.interceptors.response.use(
  response => response,
  error => {
    if (error.code === 'ECONNREFUSED') {
      logger.error(`❌ NLP Service unreachable at ${NLP_SERVICE_URL}. Is it running?`);
    } else if (error.response?.status === 500) {
      logger.error(`❌ NLP Service error: ${error.response.data?.detail || 'Unknown error'}`);
    }
    return Promise.reject(error);
  }
);

// ──────────────────────────────────────────────────────────────────────────────
// Health Check
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Check if NLP service is available
 */
async function healthCheck() {
  try {
    const response = await nlpClient.get('/health');
    logger.info('✅ NLP Service is healthy');
    return response.data;
  } catch (error) {
    logger.error('❌ NLP Service health check failed:', error.message);
    throw new Error('NLP Service is unavailable');
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Embedding Generation
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Generate embeddings for a list of skill texts
 * @param {string[]} texts - List of skill descriptions
 * @returns {Promise<number[][]>} - 2D array of embeddings (each 384-dimensional)
 */
async function generateEmbeddings(texts) {
  try {
    if (!texts || texts.length === 0) {
      logger.warn('⚠️ Empty texts provided to generateEmbeddings');
      return [];
    }

    const response = await nlpClient.post('/api/embeddings', {
      texts,
      model_name: 'all-MiniLM-L6-v2',
    });

    logger.info(`✅ Generated ${texts.length} embeddings`);
    return response.data.embeddings;
  } catch (error) {
    logger.error('❌ Error generating embeddings:', error.message);
    throw error;
  }
}

/**
 * Generate embedding for a single text
 * @param {string} text - Skill description
 * @returns {Promise<number[]>} - 384-dimensional embedding
 */
async function generateEmbedding(text) {
  const embeddings = await generateEmbeddings([text]);
  return embeddings[0] || [];
}

// ──────────────────────────────────────────────────────────────────────────────
// Similarity Computation
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Compute bidirectional semantic similarity for skill matching
 * 
 * @param {string[]} userWanted - Skills user wants to learn
 * @param {string[]} userOffered - Skills user can teach
 * @param {string[]} targetOffered - Skills target can teach
 * @param {string[]} targetWanted - Skills target wants to learn
 * @returns {Promise<object>} - Match scores and explanation
 */
async function computeSimilarity(userWanted, userOffered, targetOffered, targetWanted) {
  try {
    const response = await nlpClient.post('/api/similarity', {
      user_wanted: userWanted || [],
      user_offered: userOffered || [],
      target_offered: targetOffered || [],
      target_wanted: targetWanted || [],
    });

    logger.info(`✅ Computed similarity: ${response.data.final_score}`);
    return response.data;
  } catch (error) {
    logger.error('❌ Error computing similarity:', error.message);
    throw error;
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Recommendations
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Get ranked recommendations for a user
 * 
 * @param {string} userId - User ID
 * @param {string[]} userWanted - User's desired skills
 * @param {string[]} userOffered - User's offered skills
 * @param {array} candidates - Array of candidate users with their skills
 *   Format: [{user_id, skills_offered, skills_wanted}, ...]
 * @returns {Promise<object>} - Ranked recommendations
 */
async function getRecommendations(userId, userWanted, userOffered, candidates) {
  try {
    const response = await nlpClient.post('/api/recommendations', {
      user_id: userId,
      user_skills_wanted: userWanted || [],
      user_skills_offered: userOffered || [],
      candidates,
    });

    logger.info(`✅ Generated ${response.data.recommendations.length} recommendations`);
    return response.data;
  } catch (error) {
    logger.error('❌ Error generating recommendations:', error.message);
    throw error;
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Batch Operations
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Generate embeddings in batches (optimized for bulk operations)
 * Useful when pre-computing embeddings for multiple users
 * 
 * @param {string[]} texts - List of texts to embed
 * @returns {Promise<object>} - Batch result with embeddings
 */
async function batchEmbeddings(texts) {
  try {
    const response = await nlpClient.post('/api/embeddings/batch', {
      texts,
      model_name: 'all-MiniLM-L6-v2',
    });

    logger.info(`✅ Batch generated ${response.data.count} embeddings`);
    return response.data;
  } catch (error) {
    logger.error('❌ Error in batch embeddings:', error.message);
    throw error;
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Utility: Prepare Candidate Data
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Prepare candidates for recommendation API
 * Filters out the user themselves and formats data
 * 
 * @param {array} allUsers - Array of user documents from MongoDB
 * @param {string} excludeUserId - User ID to exclude (the requester)
 * @returns {array} - Formatted candidates
 */
function prepareCandidates(allUsers, excludeUserId) {
  return allUsers
    .filter(user => user._id.toString() !== excludeUserId)
    .map(user => ({
      user_id: user._id.toString(),
      skills_offered: user.skillsOffered || [],
      skills_wanted: user.skillsWanted || [],
    }));
}

// ──────────────────────────────────────────────────────────────────────────────
// Export
// ──────────────────────────────────────────────────────────────────────────────

module.exports = {
  healthCheck,
  generateEmbeddings,
  generateEmbedding,
  computeSimilarity,
  getRecommendations,
  batchEmbeddings,
  prepareCandidates,
  nlpClient,
};
