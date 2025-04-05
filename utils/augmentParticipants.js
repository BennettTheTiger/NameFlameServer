const admin = require('firebase-admin');
const Users = require('../models/user'); // Adjust the path as necessary

async function augmentParticipants(nameContext) {
  const participants = nameContext.participants || [];

  // Map participants to promises and resolve them
  const augmentedParticipants = await Promise.all(
    participants.map(async (participantId) => {
      const systemUser = await Users.findOne({ id: participantId });
      if (systemUser?.firebaseUid) {
        const firebaseUser = await admin.auth().getUser(systemUser.firebaseUid);
        return {
          id: participantId,
          name: firebaseUser.displayName,
          email: firebaseUser.email || systemUser.email,
        };
      }
      return { id: participantId };
    })
  );

  nameContext.participants = augmentedParticipants;
  return nameContext;
}

module.exports = augmentParticipants;