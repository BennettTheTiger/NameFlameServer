const mongoose = require('mongoose');

const User = mongoose.model('User', new mongoose.Schema({
    userName: { type: String, unique: true, required: true },
    email: { type: String, unique: true, required: true },
    id: { type: String, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['user']}
  }, {
      collection: 'users',
      timestamps: true
  }));

module.exports = User;