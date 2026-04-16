const { extractSkills, normalizeSkills, suggestSkills } = require('../services/nlpService');

// @desc    Extract and normalize skills from free text
// @route   POST /api/nlp/extract-skills
// @access  Private (or Public, but usually protected)
const extractAndNormalizeSkills = (req, res) => {
    try {
        const { text } = req.body;
        if (!text) {
            return res.status(400).json({ message: 'Text input is required' });
        }
        
        // 1. Extract raw skills using NLP service
        const rawExtracted = extractSkills(text);
        
        // 2. Normalize those skills using the skills dictionary
        const normalized = normalizeSkills(rawExtracted);
        
        res.json({
            originalText: text,
            extractedSkills: rawExtracted,
            normalizedSkills: normalized
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Suggest skills based on partial input
// @route   GET /api/nlp/suggest-skills?q=<query>
// @access  Private
const suggestSkillsEndpoint = (req, res) => {
    try {
        const { q } = req.query;
        if (!q) {
            return res.json({ suggestions: [] });
        }
        
        const suggestions = suggestSkills(q);
        res.json({ suggestions });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    extractAndNormalizeSkills,
    suggestSkillsEndpoint
};
