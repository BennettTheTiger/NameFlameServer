const mongoose = require('mongoose');

const User = mongoose.model('User', new mongoose.Schema({
    userName: { type: String, unique: true, required: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    allowNotifications: { type: Boolean, default: true },
    email: { type: String, required: true },
    id: { type: String, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['user']}
  }, {
      collection: 'users',
      timestamps: true
  }));

module.exports = User;