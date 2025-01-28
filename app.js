const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Server } = require('socket.io');
const http = require('http');

// Initialize Server
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // Allow cross-origin requests
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});

// Middleware
app.use(bodyParser.json());
app.use(cors());

// MongoDB connection
const mongoURI = 'mongodb://localhost:27017/babyNameApp';
if (process.env.NODE_ENV !== 'test') {
    mongoose.connect(mongoURI)
      .then(() => console.log('MongoDB connected'))
      .catch((err) => console.log('MongoDB connection error:', err));
}

// Sample User and Favorites Models
const User = mongoose.model('User', new mongoose.Schema({
  email: String,
  password: String,
  id: String
}));

const Name = mongoose.model('Name', new mongoose.Schema({
  name: String,
  origin: String,
  meaning: String,
  gender: String,
}));

// Routes
app.post('/api/v1/auth/register', async (req, res) => {
  const { email, password } = req.body;
  const existingUser = await User.findOne({ email });
  if (existingUser) return res.status(400).send({ message: 'User already exists' });

  const newUser = new User({ email, password });
  await newUser.save();
  res.status(201).send({ message: 'User registered successfully' });
});

app.post('/api/v1/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email, password });
  if (!user) return res.status(401).send({ message: 'Invalid credentials' });

  res.status(200).send({ message: 'Login successful', userId: user._id });
});

app.get('/api/v1/names', async (req, res) => {
  const { gender, origin } = req.query;
  const query = {};

  if (gender) query.gender = gender;
  if (origin) query.origin = origin;

  const names = await Name.find(query).limit(50);
  res.status(200).send(names);
});

app.put('/api/v1/favorites', async (req, res) => {
  const { userId, nameId } = req.body;

  const user = await User.findById(userId);
  if (!user) return res.status(404).send({ message: 'User not found' });

  if (!user.favorites.includes(nameId)) user.favorites.push(nameId);
  await user.save();
  res.status(200).send({ message: 'Name added to favorites', favorites: user.favorites });
});

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

app.get('/api/v1/hello', async (req, res) => {
    res.status(200).send('Hello');
  });

// turn of this header for security
app.disable('x-powered-by');
// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
