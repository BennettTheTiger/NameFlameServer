const express = require('express');
const admin = require('../../../firebase');
const User = require('../../../models/user');
const { BadRequestError } = require('../../../middleware/errors');
const logger = require('../../../logger');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

router.post('/register', async (req, res, next) => {
  const { email, password, userName } = req.body;

  try {
    // Create a new user in Firebase Authentication
    let firebaseUser = await admin.auth().getUserByEmail(email);
    if (firebaseUser) {
      logger.info(`User with email ${email} already exists in Firebase`);
    }
    else {
        firebaseUser = await admin.auth().createUser({
            email,
            password,
            displayName: userName,
        });
        logger.info(`User ${userName} created in Firebase with UID: ${firebaseUser.uid}`);
    }

    const existingUser = await User.findOne({ fireBaseUid: { $eq: firebaseUser.uid } });
    if (existingUser) {
        logger.info(`A firebase user with UID ${firebaseUser.uid} already exists in MongoDB`);
        throw new BadRequestError('User already exists, please login');
    }

    // Create a new user in MongoDB
    const newUser = new User({
      email,
      userName,
      id: uuidv4(), // Generate a random ID
      firebaseUid: firebaseUser.uid, // Store the Firebase UID
    });

    // Validate the new user
    const validationError = newUser.validateSync();
    if (validationError) {
      throw new BadRequestError(validationError.message);
    }

    // Save the new user in MongoDB
    await newUser.save();
    logger.info(`User ${userName} created in MongoDB with ID: ${newUser.id}`);

    res.status(200).send('User registered successfully');
  } catch (err) {
    next(err); // Pass the error to the error handling middleware
  }
});

module.exports = router;