const express = require('express');
const { createReview, getReviewsForUser } = require('../controllers/reviewController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.route('/').post(protect, createReview);
router.route('/:userId').get(protect, getReviewsForUser);

module.exports = router;
