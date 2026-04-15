const Match = require('../models/Match');

// @desc    Request a match with optional message
// @route   POST /api/matches
// @access  Private
const requestMatch = async (req, res) => {
  try {
    const { recipientId, message } = req.body;

    if (req.user._id.toString() === recipientId) {
      return res.status(400).json({ message: 'Cannot match with yourself' });
    }

    // Check if a pending OR accepted request already exists between these two users
    const existingMatch = await Match.findOne({
      $or: [
        { requester: req.user._id, recipient: recipientId },
        { requester: recipientId, recipient: req.user._id }
      ],
      status: { $in: ['pending', 'accepted'] }
    });

    if (existingMatch) {
      return res.status(400).json({ message: 'A request already exists with this user.' });
    }

    const match = await Match.create({
      requester: req.user._id,
      recipient: recipientId,
      message: message || '',
    });

    // Populate before returning so the client has full info immediately
    const populated = await Match.findById(match._id)
      .populate('requester', 'name avatar skillsOffered skillsWanted')
      .populate('recipient', 'name avatar skillsOffered skillsWanted');

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Accept or reject an incoming match request
// @route   PUT /api/matches/:id
// @access  Private
const respondToMatch = async (req, res) => {
  try {
    const { status } = req.body;

    if (!['accepted', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }

    const match = await Match.findById(req.params.id);

    if (!match) {
      return res.status(404).json({ message: 'Match not found' });
    }

    // Only the recipient can accept or reject
    if (match.recipient.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to respond to this request' });
    }

    match.status = status;
    const updatedMatch = await match.save();

    const populated = await Match.findById(updatedMatch._id)
      .populate('requester', 'name avatar skillsOffered skillsWanted')
      .populate('recipient', 'name avatar skillsOffered skillsWanted');

    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all user requests (incoming + outgoing)
// @route   GET /api/matches
// @access  Private
const getMatches = async (req, res) => {
  try {
    const matches = await Match.find({
      $or: [
        { requester: req.user._id },
        { recipient: req.user._id }
      ]
    })
      .populate('requester', 'name avatar skillsOffered skillsWanted trustScore')
      .populate('recipient', 'name avatar skillsOffered skillsWanted trustScore')
      .sort({ createdAt: -1 }); // Newest first

    res.json(matches);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { requestMatch, respondToMatch, getMatches };
