const mongoose = require('mongoose');

const Invitation = mongoose.model('Invitation', new mongoose.Schema({
    email: { type: String },
    nameContextId: { type: String },
    expiresAt: { type : Date, default: Date.now() + Number(process.env.INVITE_EXPIRATION_DURATION * 1000) },
    createdAt: { type: Date, default: Date.now, expires: process.env.INVITE_EXPIRATION_DURATION }
  }, {
      collection: 'invitations',
      timestamps: true
  }));

module.exports = Invitation;