const mongoose = require('mongoose');

const Invitation = mongoose.model('Invitation', new mongoose.Schema({
    email: { type: String },
    nameContextId: { type: String },
    createdAt: { type: Date, default: Date.now, expires: 3600 }
  }, {
      collection: 'invitations',
      timestamps: true
  }));

module.exports = Invitation;