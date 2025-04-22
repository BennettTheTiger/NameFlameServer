const { io, app, server } = require('./server');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const logger = require('./logger');

require('dotenv').config();

const authMiddleware = require('./middleware/auth');
const { login, register, systemUser } = require('./routes/v1/auth');
const nameContextRouter = require('./routes/v1/nameContext');
const nameRouter = require('./routes/v1/names');
const { errorHandler } = require('./middleware/errors');
const addSystemUser = require('./middleware/addSystemUser');
const userRouter = require('./routes/v1/user');

// Handle socket connections
io.on('connection', (socket) => {
  logger.info('A user connected:', socket.id);

  // Join the user to a room for a specific NameContext
  socket.on('joinNameContext', (nameContextId) => {
    socket.join(`nameContext:${nameContextId}`);
    logger.info(`User ${socket.id} joined room nameContext:${nameContextId}`);
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    logger.info('A user disconnected:', socket.id);
  });
});

// Rate limiter configurations
const defaultLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
});

const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 25,
});

// Middleware
app.use(bodyParser.json());
app.use(cors());

// MongoDB connection
const mongoURI = `mongodb+srv://nameflameserver:${process.env.DB_PASSWORD}@cluster0.b9oa5.mongodb.net/app-data?retryWrites=true&w=majority&appName=Cluster0`;
if (process.env.NODE_ENV !== 'test') {
  mongoose.connect(mongoURI)
    .then(() => logger.info('MongoDB connected'))
    .catch((err) => logger.error('MongoDB connection error:', err));
}

app.use('/api/v1/auth', loginLimiter, login);
app.use('/api/v1/auth', registerLimiter, register);
app.use('/api/v1/auth', defaultLimiter, authMiddleware, systemUser);
// protected routes
app.use('/api/v1', defaultLimiter, authMiddleware, nameRouter);
app.use('/api/v1', defaultLimiter, authMiddleware, addSystemUser, nameContextRouter);
app.use('/api/v1', defaultLimiter, authMiddleware, addSystemUser, userRouter);

app.get('/', async (req, res) => {
  res.status(200).send('Hello');
});

// turn off this header for security
app.disable('x-powered-by');

app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => logger.info(`Server running on port ${PORT}`));

module.exports = { app, server, io };