const Message = require('../models/Message');

const socketHandler = (io) => {
  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.on('join_room', (matchId) => {
      socket.join(matchId);
      console.log(`User joined room: ${matchId}`);
    });

    socket.on('send_message', async (data) => {
      const { matchId, sender, text } = data;
      try {
        const message = await Message.create({ matchId, sender, text });
        // Emit to everyone in the room, including sender, or use socket.to().emit()
        // Here we emit to entire room so sender also gets it back to update UI easily
        io.to(matchId).emit('receive_message', message);
      } catch (error) {
        console.error('Error saving message:', error);
      }
    });

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.id}`);
    });
  });
};

module.exports = socketHandler;
