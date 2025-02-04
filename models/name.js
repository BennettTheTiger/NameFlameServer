const mongoose = require('mongoose');

const Name = mongoose.model('Name', new mongoose.Schema({
  name: { type: String, required: true },
  origin: String,
  meaning: String,
  gender: { type: String, enum: ['male', 'female', 'non-binary'] }
}, {
    collection: 'names'
}));

module.exports = Name;