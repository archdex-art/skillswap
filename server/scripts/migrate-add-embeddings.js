#!/usr/bin/env node

/**
 * Migration Script: Generate Embeddings for Existing Users
 * 
 * This script:
 * 1. Connects to MongoDB
 * 2. Fetches all users without embeddings or with outdated embeddings
 * 3. Calls the NLP microservice to generate embeddings
 * 4. Saves embeddings back to MongoDB
 * 
 * Usage:
 *   node scripts/migrate-add-embeddings.js
 * 
 * Note: Make sure the NLP service is running on port 8000
 */

require('dotenv').config();
const mongoose = require('mongoose');
const axios = require('axios');
const User = require('../src/models/User');

const NLP_SERVICE_URL = process.env.NLP_SERVICE_URL || 'http://localhost:8000';
const BATCH_SIZE = 10; // Process users in batches

// ──────────────────────────────────────────────────────────────────────────────
// Logger
// ──────────────────────────────────────────────────────────────────────────────

const log = {
  info: (msg) => console.log(`ℹ️  ${msg}`),
  success: (msg) => console.log(`✅ ${msg}`),
  error: (msg) => console.error(`❌ ${msg}`),
  warn: (msg) => console.warn(`⚠️  ${msg}`),
};

// ──────────────────────────────────────────────────────────────────────────────
// NLP Service Client
// ──────────────────────────────────────────────────────────────────────────────

const nlpClient = axios.create({
  baseURL: NLP_SERVICE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

/**
 * Generate embeddings via NLP service
 */
async function generateEmbeddings(texts) {
  if (!texts || texts.length === 0) return [];

  try {
    const response = await nlpClient.post('/api/embeddings', {
      texts,
      model_name: 'all-MiniLM-L6-v2',
    });
    return response.data.embeddings;
  } catch (error) {
    throw new Error(`Failed to generate embeddings: ${error.message}`);
  }
}

/**
 * Average embeddings (for multiple skills)
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

/**
 * Process a batch of users
 */
async function processBatch(users) {
  for (const user of users) {
    try {
      const updates = {};

      // Generate embedding for offered skills
      if (user.skillsOffered && user.skillsOffered.length > 0) {
        const offeredEmbeddings = await generateEmbeddings(user.skillsOffered);
        updates.embeddingOffered = averageEmbeddings(offeredEmbeddings);
      }

      // Generate embedding for wanted skills
      if (user.skillsWanted && user.skillsWanted.length > 0) {
        const wantedEmbeddings = await generateEmbeddings(user.skillsWanted);
        updates.embeddingWanted = averageEmbeddings(wantedEmbeddings);
      }

      updates.embeddingUpdatedAt = new Date();

      // Save to database
      await User.updateOne(
        { _id: user._id },
        { $set: updates }
      );

      log.success(`Updated user ${user.name} (${user._id})`);
    } catch (error) {
      log.error(`Failed to process user ${user.name}: ${error.message}`);
    }
  }
}

/**
 * Main migration function
 */
async function migrate() {
  try {
    log.info('Starting embedding migration...');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/skillswap');
    log.success('Connected to MongoDB');

    // Health check NLP service
    try {
      const health = await nlpClient.get('/health');
      log.success(`NLP Service healthy: ${health.data.status}`);
    } catch (error) {
      throw new Error(`NLP Service unavailable at ${NLP_SERVICE_URL}`);
    }

    // Find users needing embeddings
    // (Either no embeddings OR embeddings older than 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const usersNeedingEmbeddings = await User.find({
      $or: [
        { embeddingUpdatedAt: { $exists: false } },
        { embeddingUpdatedAt: null },
        { embeddingUpdatedAt: { $lt: thirtyDaysAgo } },
      ],
    });

    log.info(`Found ${usersNeedingEmbeddings.length} users needing embeddings`);

    if (usersNeedingEmbeddings.length === 0) {
      log.info('No users need embedding updates');
      await mongoose.connection.close();
      return;
    }

    // Process in batches
    for (let i = 0; i < usersNeedingEmbeddings.length; i += BATCH_SIZE) {
      const batch = usersNeedingEmbeddings.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(usersNeedingEmbeddings.length / BATCH_SIZE);

      log.info(`Processing batch ${batchNum}/${totalBatches} (${batch.length} users)...`);
      await processBatch(batch);
    }

    log.success(`✨ Migration complete! Updated ${usersNeedingEmbeddings.length} users`);
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    log.error(`Migration failed: ${error.message}`);
    process.exit(1);
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Run Migration
// ──────────────────────────────────────────────────────────────────────────────

migrate();
