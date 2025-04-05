const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const INVITE_EXPIRATION_DURATION = 24 * 60 * 60; // 1 day in seconds

const Invitation = mongoose.model('Invitation', new mongoose.Schema({
    id: { type: String, unique: true, required: true, default: () => uuidv4() },
    email: { type: String, required: true },
    nameContextId: { type: String, required: true },
    expiresAt: { type : Date, default: () => Date.now() + INVITE_EXPIRATION_DURATION * 1000 },
    createdAt: { type: Date, default: Date.now, expires: INVITE_EXPIRATION_DURATION } // TTL index
  }, {
      collection: 'invitations',
      timestamps: true
  }));

module.exports = Invitation;