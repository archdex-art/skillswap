const express = require('express');
const { requestMatch, respondToMatch, getMatches } = require('../controllers/matchController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.route('/').post(protect, requestMatch).get(protect, getMatches);
router.route('/:id').put(protect, respondToMatch);

module.exports = router;
