const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('./src/config/db');
const socketHandler = require('./src/sockets/socketHandler');

dotenv.config();
connectDB();

const app = express();

app.use(cors({
  // Accept any localhost port (handles Vite fallback from 5173 → 5174, etc.)
  origin: /^http:\/\/localhost(:\d+)?$/,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
}));
app.use(express.json());

// ── Routes ────────────────────────────────────────────────────────────────────
const authRoutes           = require('./src/routes/authRoutes');
const userRoutes           = require('./src/routes/userRoutes');
const matchRoutes          = require('./src/routes/matchRoutes');
const reviewRoutes         = require('./src/routes/reviewRoutes');
const messageRoutes        = require('./src/routes/messageRoutes');
const nlpRoutes            = require('./src/routes/nlpRoutes');
const recommendationRoutes = require('./src/routes/recommendationRoutes');

app.use('/api/auth',            authRoutes);
app.use('/api/users',           userRoutes);
app.use('/api/matches',         matchRoutes);
app.use('/api/reviews',         reviewRoutes);
app.use('/api/messages',        messageRoutes);
app.use('/api/nlp',             nlpRoutes);
app.use('/api/recommendations', recommendationRoutes);

// ── Socket.io ─────────────────────────────────────────────────────────────────
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: /^http:\/\/localhost(:\d+)?$/,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Make io accessible in controllers via req.app.get('io')
app.set('io', io);

socketHandler(io);

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 6060;

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use. Set a different PORT in server/.env or stop the process using it.`);
    process.exit(1);
  }
  throw err;
});

server.listen(PORT, () => {
  console.log(`✅ Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
