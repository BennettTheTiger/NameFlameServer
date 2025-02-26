const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const _ = require('lodash');
const logger = require('../../../logger');

const User = require('../../../models/user');
const { InternalServerError, BadRequestError } = require('../../../middleware/errors');

router.post('/login', async (req, res, next) => {
  const { userName, password } = req.body;

  try {
      // Check if the user exists
      let user = await User.findOne({ userName: { $eq: userName } });
      if (!user) {
        logger.log('info', `User ${userName} not found`);
        throw new BadRequestError('Invalid credentials');
      }

      // Validate password
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        logger.log('info', `Invalid password for user ${userName}`);
        throw new BadRequestError('Invalid credentials');
      }

      // Generate JWT token
      const payload = _.pick(user, ['id', 'userName', 'role', 'firstName', 'lastName']);

      jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: 3600 },
      (err, token) => {
        if (err) {
            logger.error(`Error generating token: ${err.message}`);
            throw new InternalServerError('Error generating token');
        }
        res.json({ token });
      });
  } catch (err) {
        logger.error(`Error logging in user: ${err.message}`);
        next(err);
  }
});

module.exports = router;
