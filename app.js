const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Server } = require('socket.io');
const http = require('http');
const rateLimit = require('express-rate-limit');

require('dotenv').config();

const authMiddleware = require('./middleware/auth');
const { login, register } = require('./routes/v1/auth');
const nameContextRouter = require('./routes/v1/nameContext');
const nameRouter = require('./routes/v1/names');

// Initialize Server
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // Allow cross-origin requests
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});

// Rate limiter configurations
const defaultLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
});

const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 2,
});

// Middleware
app.use(bodyParser.json());
app.use(cors());

// MongoDB connection
const mongoURI = `mongodb+srv://nameflameserver:${process.env.DB_PASSWORD}@cluster0.b9oa5.mongodb.net/app-data?retryWrites=true&w=majority&appName=Cluster0`;
if (process.env.NODE_ENV !== 'test') {
    mongoose.connect(mongoURI)
      .then(() => console.log('MongoDB connected'))
      .catch((err) => console.log('MongoDB connection error:', err));
}

app.use('/api/v1/auth', loginLimiter, login);
app.use('/api/v1/auth', registerLimiter, register);
app.use('/api/v1', authMiddleware, defaultLimiter,  nameRouter); // TODO but this behind auth middleware
// protected routes
app.use('/api/v1', authMiddleware, defaultLimiter, nameContextRouter);

// Real-time collaboration with Socket.io
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Handle collaboration events (e.g., shared profile updates)
  socket.on('collaborate', (data) => {
    console.log('Collaboration data received:', data);
    io.emit('collaborationUpdate', data); // Broadcast to all clients
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

app.get('/', async (req, res) => {
    res.status(200).send('Hello');
});

// turn of this header for security
app.disable('x-powered-by');
// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
