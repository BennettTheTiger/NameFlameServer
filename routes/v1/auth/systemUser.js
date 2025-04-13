const express = require('express');
const User = require('../../../models/user');
const logger = require('../../../logger');
const authMiddleware = require('../../../middleware/auth');
const _ = require('lodash');
const { NotFoundError } = require('../../../middleware/errors');
const Joi = require('joi');

const router = express.Router();

function trimResponse(user) {
  return _.pick(user, ['id', 'email', 'theme', 'allowNotifications']);
}

router.get('/systemUser', authMiddleware, async (req, res, next) => {
  try {
    const systemUser = await User.findOne({ firebaseUid: req.userData.uid });
    logger.info(`System user ${systemUser.id} found`);
    const userData = trimResponse(systemUser);
    res.status(200).send(userData);
  } catch (err) {
    next(err);
  }
});

router.patch('/systemUser', authMiddleware, async (req, res, next) => {
  try {
    const dataToUpdate = _.pick(req.body, ['theme', 'allowNotifications']);
    
    const schema = Joi.object({
      theme: Joi.string().valid('light', 'dark').optional(),
      allowNotifications: Joi.boolean().optional()
    });
    
    const { error } = schema.validate(dataToUpdate);
    if (error) {
      return res.status(400).send({ error: error.details[0].message });
    }
    
    const systemUser = await User.findOneAndUpdate(
      { firebaseUid: req.userData.uid },
      dataToUpdate,
      { new: true }
    );
    if (!systemUser) {
      logger.error(`System user ${req.userData.uid} not found`);
      throw new NotFoundError('System user not found');
    }
    logger.info(`System user ${systemUser.id} updated`);
    const userData = trimResponse(systemUser);
    res.status(200).send(userData);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
