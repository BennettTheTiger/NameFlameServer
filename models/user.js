const mongoose = require('mongoose');

const User = mongoose.model('User', new mongoose.Schema({
    allowNotifications: { type: Boolean, default: true },
    email: { type: String, required: true },
    id: { type: String, unique: true },
    firebaseUid: { type: String, required: true, unique: true },
    role: { type: String, enum: ['user']},
    theme: { type: String, enum: ['system', 'light', 'dark'], default: 'system' },
  }, {
      collection: 'users',
      timestamps: true
  }));

module.exports = User;