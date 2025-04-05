const express = require('express');
const User = require('../../../models/user');
const logger = require('../../../logger');
const authMiddleware = require('../../../middleware/auth');
const _ = require('lodash');

const router = express.Router();

router.get('/systemUser', authMiddleware, async (req, res, next) => {
  try {
    const systemUser = await User.findOne({ firebaseUid: req.userData.uid });
    logger.info(`System user ${systemUser.id} found`);
    const userData = _.pick(systemUser, ['id', 'email', 'theme', 'allowNotifications']);
    res.status(200).send(userData);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
