/**
 * socketHandler.js
 *
 * Manages:
 *  - Per-user personal rooms for targeted notifications
 *  - Real-time chat (join_room / send_message / receive_message)
 *  - open_chat trigger after request accepted
 */

const Message = require('../models/Message');

/** Map of userId (string) → socketId for targeted emits */
const userSocketMap = new Map();

const socketHandler = (io) => {
  io.on('connection', (socket) => {
    console.log(`[Socket] Connected: ${socket.id}`);

    // ── User Registration → Personal Room ─────────────────────────────────
    // Client sends this immediately after connecting with their userId
    socket.on('register_user', (userId) => {
      if (!userId) return;
      userSocketMap.set(userId, socket.id);
      socket.join(`user:${userId}`);
      console.log(`[Socket] User ${userId} registered → room user:${userId}`);
    });

    // ── Chat Room ─────────────────────────────────────────────────────────
    socket.on('join_room', (matchId) => {
      socket.join(matchId);
      console.log(`[Socket] ${socket.id} joined room ${matchId}`);
    });

    socket.on('send_message', async (data) => {
      const { matchId, sender, text } = data;
      if (!matchId || !sender || !text) return;
      try {
        const message = await Message.create({ matchId, sender, text });
        // Populate sender name/avatar for display
        const populated = await message.populate('sender', 'name avatar');
        io.to(matchId).emit('receive_message', populated);
      } catch (error) {
        console.error('[Socket] Error saving message:', error.message);
        socket.emit('message_error', { message: 'Failed to send message' });
      }
    });

    // ── Typing Indicator ──────────────────────────────────────────────────
    socket.on('typing', ({ matchId, userId, name }) => {
      socket.to(matchId).emit('user_typing', { userId, name });
    });

    socket.on('stopped_typing', ({ matchId }) => {
      socket.to(matchId).emit('user_stopped_typing');
    });

    // ── Disconnect ────────────────────────────────────────────────────────
    socket.on('disconnect', () => {
      // Clean up the mapping
      for (const [userId, sid] of userSocketMap.entries()) {
        if (sid === socket.id) {
          userSocketMap.delete(userId);
          break;
        }
      }
      console.log(`[Socket] Disconnected: ${socket.id}`);
    });
  });
};

module.exports = socketHandler;
