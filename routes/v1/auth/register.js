const express = require('express');
const admin = require('../../../firebase');
const User = require('../../../models/user');
const { BadRequestError, InternalServerError } = require('../../../middleware/errors');
const logger = require('../../../logger');
const { v4: uuidv4 } = require('uuid');
const Invitation = require('../../../models/invitations');
const NameContext = require('../../../models/nameContext');
const escape = require('escape-html');
const sendUpdateNameContextEvent = require('../../../events/updateNameContext');

const router = express.Router();

router.post('/register', async (req, res, next) => {
  const { email, password, userName } = req.body;

  try {
    let firebaseUser;
    try {
      // Check if the user already exists in Firebase Authentication
      firebaseUser = await admin.auth().getUserByEmail(email);
      logger.info(`User with email ${escape(email)} already exists in Firebase`);
    } catch {
      logger.info(`User with email ${escape(email)} does not exist in Firebase`);
      // Create a new user in Firebase Authentication
      firebaseUser = await admin.auth().createUser({
        displayName: userName,
        email,
        password,
      });
    }

    if (!firebaseUser) {
      throw new InternalServerError('Failed to retrieve or create user');
    }
    logger.info(`Email ${escape(email)} created in Firebase with UID: ${firebaseUser.uid}`);

    const existingUser = await User.findOne({ firebaseUid: { $eq: firebaseUser.uid } });
    if (existingUser) {
      logger.info(`A firebase user with UID ${firebaseUser.uid} already exists in MongoDB`);
      throw new BadRequestError('User already exists, please login');
    }

    // Create a new user in MongoDB
    const newUser = new User({
      email,
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
    logger.info(`User ${escape(email)} created in MongoDB with ID: ${newUser.id}`);

    // check if the user has invites to name contexts
    const invites = await Invitation.find({ email: { $eq: email } });
    if (invites.length > 0) {
      logger.info(`User ${escape(email)} has ${invites.length} invites to name contexts`);
      // Add the user to the name contexts
      for (const invite of invites) {
        const nameContext = await NameContext.findOne({ id: { $eq: invite.nameContextId } });
        if (nameContext) {
          nameContext.participants.push(newUser.id);
          await nameContext.save();
          sendUpdateNameContextEvent(req, nameContext);
          logger.info(`User ${escape(email)} added to name context ${nameContext.name}`);
        }
      }
      // Delete the invites
      await Invitation.deleteMany({ email: { $eq: email } });
      logger.info(`Invites for ${escape(email)} deleted`);
    }

    res.status(200).send('User registered successfully');
  } catch (err) {
    next(err); // Pass the error to the error handling middleware
  }
});

module.exports = router;