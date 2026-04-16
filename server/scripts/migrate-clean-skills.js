/**
 * migrate-clean-skills.js
 * Cleans all existing users' skills through the NLP normalization pipeline.
 *
 * Run: node scripts/migrate-clean-skills.js
 *
 * Handles dirty patterns from skillswapv1 Profile (comma-split raw sentences):
 *   "i teach js"       → "JavaScript"
 *   "i want to learn guitar" → "Guitar"
 *   "ml"               → "Machine Learning"
 *   "react"            → "React"
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../src/models/User');
const { extractSkills, normalizeSkills } = require('../src/services/nlpService');

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/skillswap';

// Fully process a skill array: handle both tokens ("js") and dirty sentences ("i teach js")
function fullyNormalize(arr) {
  if (!Array.isArray(arr)) return [];
  const result = arr.flatMap(chip => {
    if (!chip || !chip.trim()) return [];
    chip = chip.trim();
    // If multi-word and not a known skill phrase, extract tokens from it first
    return normalizeSkills(chip.includes(' ') ? extractSkills(chip) : [chip]);
  });
  return [...new Set(result)].filter(Boolean);
}

async function migrateSkills() {
  await mongoose.connect(MONGO_URI);
  console.log(`✅ Connected to MongoDB: ${MONGO_URI}\n`);

  const users = await User.find({});
  console.log(`🔍 Found ${users.length} users to process\n`);

  let updated = 0;
  let skipped = 0;

  for (const user of users) {
    const beforeOffered = [...(user.skillsOffered || [])];
    const beforeWanted  = [...(user.skillsWanted  || [])];

    // Run through full normalization pipeline
    let cleanOffered = fullyNormalize(beforeOffered);
    let cleanWanted  = fullyNormalize(beforeWanted);

    // Also process any saved raw input text (rawSkillsOfferedInput / rawSkillsWantedInput)
    if (user.rawSkillsOfferedInput) {
      const fromRaw = normalizeSkills(extractSkills(user.rawSkillsOfferedInput));
      fromRaw.forEach(s => { if (!cleanOffered.includes(s)) cleanOffered.push(s); });
    }
    if (user.rawSkillsWantedInput) {
      const fromRaw = normalizeSkills(extractSkills(user.rawSkillsWantedInput));
      fromRaw.forEach(s => { if (!cleanWanted.includes(s)) cleanWanted.push(s); });
    }

    const offeredChanged = JSON.stringify(beforeOffered.sort()) !== JSON.stringify(cleanOffered.sort());
    const wantedChanged  = JSON.stringify(beforeWanted.sort())  !== JSON.stringify(cleanWanted.sort());

    if (offeredChanged || wantedChanged) {
      user.skillsOffered = cleanOffered;
      user.skillsWanted  = cleanWanted;
      await user.save();

      console.log(`👤 ${user.name} <${user.email}>`);
      if (offeredChanged) {
        console.log(`   skillsOffered: ${JSON.stringify(beforeOffered)}`);
        console.log(`              → ${JSON.stringify(cleanOffered)}`);
      }
      if (wantedChanged) {
        console.log(`   skillsWanted:  ${JSON.stringify(beforeWanted)}`);
        console.log(`              → ${JSON.stringify(cleanWanted)}`);
      }
      console.log('');
      updated++;
    } else {
      skipped++;
    }
  }

  console.log(`✅ Done: ${updated} users updated, ${skipped} already clean`);
  await mongoose.disconnect();
  process.exit(0);
}

migrateSkills().catch(err => {
  console.error('❌ Migration failed:', err.message);
  process.exit(1);
});
