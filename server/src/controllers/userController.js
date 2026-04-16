const User = require('../models/User');
const { extractSkills, normalizeSkills, matchSkills } = require('../services/nlpService');

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Update user profile (NLP-powered skill extraction + normalization)
// @route   PUT /api/users/profile
// @access  Private
// ─────────────────────────────────────────────────────────────────────────────
const updateUserProfile = async (req, res) => {
  const {
    name, bio, availability, location, avatar,
    rawSkillsOfferedInput, rawSkillsWantedInput,
    skillsOffered, skillsWanted,                   // legacy comma-array fallback
  } = req.body;

  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.name         = name         || user.name;
    user.bio          = bio          !== undefined ? bio : user.bio;
    user.availability = availability || user.availability;
    user.avatar       = avatar       || user.avatar;

    if (location?.coordinates) {
      user.location = { type: 'Point', coordinates: location.coordinates };
    }

    // ── NLP Skill Processing ────────────────────────────────────────────────
    let finalOffered = [];
    if (Array.isArray(skillsOffered)) {
      finalOffered = [...normalizeSkills(skillsOffered)];
    } else if (typeof skillsOffered === 'string') {
      finalOffered = [...normalizeSkills(skillsOffered.split(',').map(s => s.trim()).filter(Boolean))];
    }
    if (rawSkillsOfferedInput !== undefined && rawSkillsOfferedInput !== '') {
      user.rawSkillsOfferedInput = rawSkillsOfferedInput;
      // Extract from raw sentence then normalize mapping ("js" -> "JavaScript")
      finalOffered = [...finalOffered, ...normalizeSkills(extractSkills(rawSkillsOfferedInput))];
    }
    user.skillsOffered = [...new Set(finalOffered)];

    let finalWanted = [];
    if (Array.isArray(skillsWanted)) {
      finalWanted = [...normalizeSkills(skillsWanted)];
    } else if (typeof skillsWanted === 'string') {
      finalWanted = [...normalizeSkills(skillsWanted.split(',').map(s => s.trim()).filter(Boolean))];
    }
    if (rawSkillsWantedInput !== undefined && rawSkillsWantedInput !== '') {
      user.rawSkillsWantedInput = rawSkillsWantedInput;
      // Extract from raw sentence then normalize mapping
      finalWanted = [...finalWanted, ...normalizeSkills(extractSkills(rawSkillsWantedInput))];
    }
    user.skillsWanted = [...new Set(finalWanted)];

    const updatedUser = await user.save();
    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Get nearby users with enhanced NLP-based match scoring
// @route   GET /api/users/discover
// @access  Private
// ─────────────────────────────────────────────────────────────────────────────
const getNearbyMatches = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user?.location?.coordinates?.length) {
      return res.status(400).json({ message: 'Your location is not set' });
    }

    const { coordinates } = user.location;
    const maxDistanceInMeters = parseInt(req.query.distance || 50) * 1000;

    const nearbyUsers = await User.aggregate([
      {
        $geoNear: {
          near: { type: 'Point', coordinates },
          distanceField: 'dist.calculated',
          maxDistance: maxDistanceInMeters,
          spherical: true,
          query: { _id: { $ne: user._id } },
        },
      },
    ]);

    const results = nearbyUsers.map(target => {
      // ── Skill Overlap (NLP-aware, bidirectional) ─────────────────────────
      const iWantTheyOffer = matchSkills(user.skillsWanted, target.skillsOffered || []);
      const theyWantIOffer = matchSkills(user.skillsOffered, target.skillsWanted || []);

      const skillOverlapScore = (iWantTheyOffer.score + theyWantIOffer.score) / 2; // 0–1

      // ── Distance Score (closer = higher) ─────────────────────────────────
      const distScore = 1 - Math.min(target.dist.calculated / maxDistanceInMeters, 1); // 0–1

      // ── Trust Score (normalised) ──────────────────────────────────────────
      const trustNorm = (target.trustScore || 50) / 100; // 0–1

      // ── Composite Match Score (0–100) ─────────────────────────────────────
      const matchScore = Math.round(
        (skillOverlapScore * 50) +
        (distScore        * 25) +
        (trustNorm        * 25)
      );

      // ── Match Tag ─────────────────────────────────────────────────────────
      let matchTag;
      if (matchScore >= 85)      matchTag = 'Perfect Match';
      else if (matchScore >= 70) matchTag = 'Great Match';
      else if (matchScore >= 50) matchTag = 'Good Match';
      else                       matchTag = 'Nearby';

      const reciprocalMatch = iWantTheyOffer.matched.length > 0 && theyWantIOffer.matched.length > 0;

      return {
        ...target,
        matchScore,
        matchTag,
        reciprocalMatch,
        matchedSkills: {
          youGet:    iWantTheyOffer.matched,   // skills target offers that you want
          theyGet:   theyWantIOffer.matched,   // skills you offer that target wants
        },
      };
    });

    // Sort: matchScore DESC, then distance ASC
    results.sort((a, b) =>
      b.matchScore !== a.matchScore
        ? b.matchScore - a.matchScore
        : a.dist.calculated - b.dist.calculated
    );

    res.json(results);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  updateUserProfile,
  getNearbyMatches,
};
