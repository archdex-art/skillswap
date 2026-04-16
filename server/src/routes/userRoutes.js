const express = require('express');
const {
  updateUserProfile,
  getNearbyMatches,
} = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.route('/profile').put(protect, updateUserProfile);
router.route('/discover').get(protect, getNearbyMatches);

module.exports = router;
