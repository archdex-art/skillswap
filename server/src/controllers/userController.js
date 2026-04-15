const User = require('../models/User');

// @desc    Update user profile (location, skills, bio)
// @route   PUT /api/users/profile
// @access  Private
const updateUserProfile = async (req, res) => {
  const { name, bio, skillsOffered, skillsWanted, availability, location, avatar } = req.body;

  try {
    const user = await User.findById(req.user._id);

    if (user) {
      user.name = name || user.name;
      user.bio = bio || user.bio;
      user.skillsOffered = skillsOffered || user.skillsOffered;
      user.skillsWanted = skillsWanted || user.skillsWanted;
      user.availability = availability || user.availability;
      user.avatar = avatar || user.avatar;

      if (location && location.coordinates) {
        user.location = {
          type: 'Point',
          coordinates: location.coordinates, // [lng, lat]
        };
      }

      const updatedUser = await user.save();

      res.json(updatedUser);
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get nearby users matching overlapping skills
// @route   GET /api/users/discover
// @access  Private
const getNearbyMatches = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user || (!user.location || !user.location.coordinates || user.location.coordinates.length < 2)) {
      return res.status(400).json({ message: 'Your location is not set' });
    }

    const { coordinates } = user.location;
    const maxDistanceInMeters = parseInt(req.query.distance) * 1000 || 50000; // default 50km

    const nearbyUsers = await User.aggregate([
      {
        $geoNear: {
          near: {
            type: 'Point',
            coordinates: coordinates
          },
          distanceField: 'dist.calculated',
          maxDistance: maxDistanceInMeters,
          spherical: true,
          query: { _id: { $ne: user._id } }
        }
      }
    ]);

    const results = nearbyUsers.map((target) => {
      let score = 0;
      const targetOffered = target.skillsOffered || [];
      const targetWanted = target.skillsWanted || [];

      const iWantTheyOffer = user.skillsWanted.filter(skill => targetOffered.includes(skill));
      const theyWantIOffer = user.skillsOffered.filter(skill => targetWanted.includes(skill));

      score = iWantTheyOffer.length * 2 + theyWantIOffer.length * 2;
      
      if (iWantTheyOffer.length > 0 && theyWantIOffer.length > 0) {
        score += 5;
      }

      return {
        ...target,
        matchScore: score,
        reciprocalMatch: iWantTheyOffer.length > 0 && theyWantIOffer.length > 0
      };
    });

    results.sort((a, b) => b.matchScore - a.matchScore);

    res.json(results);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { updateUserProfile, getNearbyMatches };
