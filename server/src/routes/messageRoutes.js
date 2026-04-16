const express = require('express');
const Message = require('../models/Message');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// @desc  Get all messages for a match room
// @route GET /api/messages/:matchId
// @access Private
router.get('/:matchId', protect, async (req, res) => {
  try {
    const messages = await Message.find({ matchId: req.params.matchId })
      .populate('sender', 'name avatar')
      .sort({ createdAt: 1 });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
