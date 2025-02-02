const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Server } = require('socket.io');
const http = require('http');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const { Schema } = mongoose;

const Roles = {
  User: 'user'
}

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
const mongoURI = `mongodb+srv://nameflameserver:${process.env.DB_PASSWORD}@cluster0.b9oa5.mongodb.net/app-data?retryWrites=true&w=majority&appName=Cluster0`;
if (process.env.NODE_ENV !== 'test') {
    mongoose.connect(mongoURI)
      .then(() => console.log('MongoDB connected'))
      .catch((err) => console.log('MongoDB connection error:', err));
}

const User = mongoose.model('User', new mongoose.Schema({
  userName: { type: String, unique: true, required: true },
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  role: { type: String, enum: [Roles.User]}
}, {
    collection: 'users',
    timestamps: true
}));

const NameFilterSchema = new mongoose.Schema({
    startsWithLeter: { type: String, maxLength: 1 },
    maxCharacters: { type: Number, min: [1, 'A name must be at least one character'], max: [256, 'Be honest, no one wants to have to spell a name that long']},
    noun: { type: String },
    gender: { type: String, enum: ['male', 'female', 'non-binary'] }
});


const NameContext = mongoose.model('NameContext', new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String },
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    participants: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    likedNames: { type: Schema.Types.Map, of: [{ type: Schema.Types.ObjectId, ref: 'Name' }] },
    filter: NameFilterSchema
  }, {
      collection: 'name-contexts',
      timestamps: true
  }));
console.log(NameContext);

const Name = mongoose.model('Name', new mongoose.Schema({
  name: { type: String, required: true },
  origin: String,
  meaning: String,
  gender: { type: String, enum: ['male', 'female', 'non-binary'] }
}, {
    collection: 'names'
}));

// Routes
app.post('/api/v1/auth/register', async (req, res) => {
  const { email, password, userName } = req.body;
  const existingUser = await User.findOne({ email });
  if (existingUser) return res.status(400).send({ message: 'User already exists' });

  const newUser = new User({
    userName,
    email,
    password,
    role: Roles.User
  });

  const errors = newUser.validateSync();

  if (errors) {
    return res.status(400).send({ message: errors.message });
  }

  const existingUserName = await User.findOne({ userName });
  if (existingUserName) return res.status(400).send({ message: `The username ${userName} is already taken.` });

  const salt = await bcrypt.genSalt(10);
  newUser.password = await bcrypt.hash(password, salt);

  await newUser.save();

  const payload = {
    user: { id: newUser.id }
  };

  jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: 3600 }, (err, token) => {
    if (err) throw err;
    res.json({ token });
  })

  res.status(201).send({ message: 'User registered successfully' });
});

app.post('/api/v1/auth/login', async (req, res) => {
  const { email, password } = req.body;

  try {
      // Check if the user exists
      let user = await User.findOne({ email });
      if (!user) {
          return res.status(400).json({ msg: 'Invalid credentials' });
      }

      // Validate password
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
          return res.status(400).json({ msg: 'Invalid credentials' });
      }

      // Generate JWT token
      const payload = {
          user: {
              id: user.id
          }
      };

      jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: 3600 },
      (err, token) => {
          if (err) throw err;
          res.json({ token });
      });
  } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
  }
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
