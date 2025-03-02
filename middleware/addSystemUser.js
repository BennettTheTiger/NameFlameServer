const logger = require('../logger');
const User = require('../models/user');
const { InternalServerError } = require('./errors');
const { v4: uuidv4 } = require('uuid');

module.exports = async (req, res, next) => {
  try {
    // lookup systemUser
    const systemUser = await User.findOne({ 'firebaseUid': { $eq: req.userData.uid } });
    if (!systemUser) {
      logger.info(`System user ${req.userData.uid} not found attempting to create a user`);

      const newUser = new User({
        email: req.userData.email,
        id: uuidv4(),
        firebaseUid: req.userData.uid,
      });

        const validationError = newUser.validateSync();
        if (validationError) {
          throw new InternalServerError(validationError.message);
        }
        await newUser.save();
        logger.info(`User ${req.userData.name} created in MongoDB with ID: ${newUser.id}`);
        req.systemUser = newUser.toObject();
        next();
        return;
    }
    req.systemUser = systemUser;
    next();
  } catch (err) {
    logger.info('Error finding user in the system:', err.message);
    next(new InternalServerError('Unable to find user in the system'));
  }
};