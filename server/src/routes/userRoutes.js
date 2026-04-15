const express = require('express');
const { updateUserProfile, getNearbyMatches } = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.put('/profile', protect, updateUserProfile);
router.get('/discover', protect, getNearbyMatches);

module.exports = router;
