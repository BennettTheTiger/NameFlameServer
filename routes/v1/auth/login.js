const express = require('express');
const admin = require('../../../firebase');
const User = require('../../../models/user');
const { BadRequestError } = require('../../../middleware/errors');
const logger = require('../../../logger');

const router = express.Router();

router.post('/login', async (req, res, next) => {
  const { email } = req.body;

  try {
    // Verify the user's credentials with Firebase Authentication
    const userRecord = await admin.auth().getUserByEmail(email);
    const firebaseToken = await admin.auth().createCustomToken(userRecord.uid);

    // Retrieve additional user information from MongoDB
    const user = await User.findOne({ email: { $eq: email } });
    if (!user) {
      logger.info(`User with email ${email} not found`);
      throw new BadRequestError('Invalid credentials');
    }

    res.status(200).json({ token: firebaseToken, user });
  } catch (err) {
    next(err); // Pass the error to the error handling middleware
  }
});

module.exports = router;
