const express = require('express');
const { extractAndNormalizeSkills, suggestSkillsEndpoint } = require('../controllers/nlpController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.route('/extract-skills').post(protect, extractAndNormalizeSkills);
router.route('/suggest-skills').get(protect, suggestSkillsEndpoint);

module.exports = router;
