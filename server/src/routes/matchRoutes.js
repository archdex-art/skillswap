const express = require('express');
const {
  requestMatch,
  respondToMatch,
  getMatches,
  scheduleSession,
  completeMatch,
} = require('../controllers/matchController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.route('/').post(protect, requestMatch).get(protect, getMatches);
router.route('/:id').put(protect, respondToMatch);
router.route('/:id/schedule').put(protect, scheduleSession);
router.route('/:id/complete').put(protect, completeMatch);

module.exports = router;
