const express = require('express');
const admin = require('../../../firebase');
const User = require('../../../models/user');
const NameContext = require('../../../models/nameContext');
const { NotFoundError } = require('../../../middleware/errors');
const logger = require('../../../logger');

const router = express.Router();

// DELETE /api/v1/user - Delete a user by Firebase UID and clean up name contexts
router.delete('/user', async (req, res, next) => {
  const { systemUser, userData } = req;
  const userSystemId = systemUser.id;

  try {
    // Delete the user from Firebase Authentication
    await admin.auth().deleteUser(userData.uid);
    logger.info(`User with UID ${userData.uid} deleted from Firebase`);

    // Delete the user from MongoDB
    const userResult = await User.deleteOne({ id: userSystemId });
    if (userResult.deletedCount === 0) {
      throw new NotFoundError(`User with UID ${userSystemId} not found the system.`);
    }
    logger.info(`User with UID ${userSystemId} deleted from MongoDB`);

    // Clean up name contexts owned by the user
    const nameContextResult = await NameContext.deleteMany({ owner: userSystemId });
    logger.info(`Deleted ${nameContextResult.deletedCount} name contexts owned by user with UID ${userSystemId}`);

    res.status(204).send(); // No Content
  } catch (err) {
    logger.error(`Error deleting user with UID ${userSystemId}:`, err.message);
    next(err);
  }
});

module.exports = router;