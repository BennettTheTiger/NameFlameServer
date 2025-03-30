const express = require('express');
const validator = require('validator');
const _ = require('lodash');
const router = express.Router();
const processNameResult = require('../names/utils');
const { v4: uuidv4 } = require('uuid');
const NameContext = require('../../../models/nameContext');
const Invitation = require('../../../models/invitations');
const Users = require('../../../models/user');
const Name = require('../../../models/name');
const checkNameContextOwner = require('../../../middleware/checkNameContextOwner');
const { NotFoundError, BadRequestError } = require('../../../middleware/errors');
const logger = require('../../../logger');
const sendEmail = require('../../../mailer/sendgrid');
const admin = require('../../../firebase');
const checkNameContextOwnerOrPartipant = require('../../../middleware/checkNameContextOwnerOrParticipant');

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

function trimNameContext(req, nameContext) {
  const userId = req.systemUser.id;
  const result = nameContext.toObject();
  result.likedNames = result.likedNames?.[userId] || [];
  result.isOwner = result.owner === req.systemUser.id;
  delete result._id;
  delete result.owner;
  delete result.__v;
  return result;
}

router.get('/nameContext/:id', checkNameContextOwnerOrPartipant, async (req, res, next) => {
    try {
      const { nameContext } = req;
      const nameContextResult = trimNameContext(req, nameContext);
      const augmentedNameContext = await augmentParticipants(nameContextResult);
      res.status(200).send(augmentedNameContext);
    }
    catch (err) {
      next(err);
    }
  });

  router.get('/nameContext/:id/invites', checkNameContextOwner, async (req, res, next) => {
    const { id } = req.params;

    try {
      const invites = await Invitation.find({ nameContextId: id });
      const trimedInvites = invites.map((invite) => _.pick(invite, ['id', 'email', 'expiresAt']));
      res.status(200).send(trimedInvites);
    }
    catch (err) {
      next(err);
    }
  });

  router.delete('/nameContext/:id/invite/:inviteId', checkNameContextOwner, async (req, res, next) => {
    const { inviteId } = req.params;

    try {
      await Invitation.deleteOne({ id: inviteId });
      logger.info(`Invitation ${inviteId} deleted`);
      res.status(200).send();
    }
    catch (err) {
      next(err);
    }
  });

  router.get('/nameContexts', async (req, res, next) => {
    const nameContexts = await NameContext.find({
      $or: [
        { owner: req.systemUser.id }, // Check if the user is the owner
        { participants: { $in: [req.systemUser.id] } } // Check if the user is in the participants array
      ]
    });

    try {
      const result = nameContexts.map((item) => trimNameContext(req, item));
      res.status(200).send(result);
    }
    catch (err) {
      logger.error('Error getting name contexts:', err.message);
      next(err);
    }
  });

  router.post('/nameContext', async (req, res, next) => {
    const { name, description, filter, noun } = req.body;

    try {
      const newNameContext = new NameContext({
        name,
        description,
        noun,
        owner: req.systemUser.id, // from addSystemUser middleware
        id: uuidv4(),
        participants: [], // TODO add participants
        filter: filter
      });

      const errors = newNameContext.validateSync();

      if (errors) {
        throw new BadRequestError(errors.message, errors.errors);
      }

      await newNameContext.save();
      res.status(201).send('Name context added');
    } catch (err) {
      logger.error('Error adding name context:', err.message);
      next(err);
    }
  });

  router.patch('/nameContext/:id', checkNameContextOwner, async (req, res, next) => {
    const { name, description, filter } = req.body;

    try {
      const nameContext = req.nameContext;

      // Update fields if they are present in the request body
      if (name) nameContext.name = name;
      if (description) nameContext.description = description;
      if (filter) nameContext.filter = filter;

      const errors = nameContext.validateSync();
      if (errors) {
        return res.status(400).send({ message: errors.message });
      }

      await nameContext.save();
      const result = trimNameContext(req, nameContext);
      const augmentedNameContext = await augmentParticipants(result);
      res.status(200).send(augmentedNameContext);
    } catch (err) {
      logger.error('Error updating name context:', err.message);
      next(err);
    }
  });

  router.post('/nameContext/:id/participant', checkNameContextOwner, async (req, res, next) => {
    const { email } = req.body;

    try {
      const nameContext = req.nameContext;

      // Validate email address
      if (!validator.isEmail(email)) {
        throw new BadRequestError('Invalid email address');
      }

      if (req.systemUser.email === email) {
        throw new BadRequestError('Owner cannot be added as a participant');
      }

      const userRecord = await Users.findOne({ email });
      const existingInvite = await Invitation.findOne({ email, nameContextId: nameContext.id });

      if (!userRecord && !existingInvite) {
        const invite = new Invitation({
          email,
          nameContextId: nameContext.id
        });
        await invite.save();
        await sendEmail(email, nameContext);
        logger.info(`Invitation sent to ${email} for name context ${nameContext.id}`);
        return res.status(201).send({ type: 'invite', message: 'Invitation sent' });
      }

      if (!existingInvite && userRecord && !nameContext.participants.includes(userRecord.id)) {
        nameContext.participants.push(userRecord.id);
        await nameContext.save();
        logger.info(`User ${email} added to name context ${nameContext.id}`);
        return res.status(201).send({ type: 'user', message: 'User added' });
      }

      logger.info(`User ${email} can contribute to ${nameContext.id}`);
      res.status(200).send(`User ${email} can contribute to ${nameContext.id}`);
    } catch (err) {
      logger.error('Error updating name context:', err.message);
      next(err);
    }
  });

router.delete('/nameContext/:id/participant/:participantId', checkNameContextOwner, async (req, res, next) => {
  const { id, participantId } = req.params;

  try {
    const nameContext = await NameContext.findOne({ id });

    if (!nameContext) {
      throw new NotFoundError(`Name context ${id} not found`);
    }

    nameContext.participants = _.without(nameContext.participants, participantId);
    nameContext.likedNames = _.omit(nameContext.likedNames, [participantId]);
    await nameContext.save();

    logger.info(`Participant ${participantId} removed from name context ${id}`);
    res.status(204).send({ message: `Participant ${participantId} removed from name context ${id}` });
  } catch (err) {
    logger.error('Error removing participant from name context:', err.message);
    next(err);
  }
});

router.get('/nameContext/:id/nextNames', checkNameContextOwnerOrPartipant, async (req, res, next) => {
  const { limit = 10 } = req.query;
  const { nameContext } = req;

  try {
     // Parse the filter from nameContext
     const filter = nameContext.filter || {};

     // Build the MongoDB query based on the filter
     const mongoQuery = {};
     if (filter.startsWithLetter) {
       mongoQuery.name = { $regex: `^${filter.startsWithLetter}`, $options: 'i' };
     }
     if (filter.maxCharacters) {
       mongoQuery.$expr = { $lte: [{ $strLenCP: "$name" }, filter.maxCharacters] };
     }

    // Exclude names that the user has already liked
    const likedNames = nameContext.likedNames || new Map();
    const userLikedNames = likedNames[req.systemUser.id] || [];
    if (userLikedNames.length > 0) {
      mongoQuery.name = { ...mongoQuery.name, $nin: userLikedNames };
    }

    const sizeLimit = Math.min(parseInt(limit || 0, 10), 50);

    // Use MongoDB aggregation to apply the filter and sample the results
    const namesResults = await Name.aggregate([
      { $match: mongoQuery },
      { $sample: { size: sizeLimit } } // Randomly sample the results
    ]);

    let names = namesResults.map(processNameResult);

    // Filter out names that don't match the specified gender
    if (filter.gender && filter.gender !== 'neutral') {
      names = names.filter(name => name.gender === filter.gender);
    }

    // If there are not enough names, get more names
    while (names.length < sizeLimit) {
      const additionalNamesResult = await Name.aggregate([
        { $match: mongoQuery },
        { $sample: { size: sizeLimit - names.length } } // Randomly sample the remaining results
      ]).then(results => results.map(processNameResult));

      let additionalNames = additionalNamesResult.filter(name => !names.some(n => n.name === name.name));

      if (filter.gender && filter.gender !== 'neutral') {
        additionalNames = additionalNames.filter(name => name.gender === filter.gender);
      }

      names.push(...additionalNames);

      if (additionalNames.length === 0) {
        logger.info('No more names to fetch with filter', JSON.stringify(filter));
        break; // No more names to fetch didnt get enough names to meet the target sizeLimit
      }
    }
    // Return the filtered names
    res.status(200).send(names);
  } catch (err) {
    logger.error('Error fetching next set of names:', err.message);
    next(err);
  }
});

  router.patch('/nameContext/:id/match', checkNameContextOwnerOrPartipant, async (req, res, next) => {
    const { id } = req.params;
    const { name } = req.body;
    const { nameContext } = req;
    const userSystemId = req.systemUser.id;

    try {
      if (!name) throw new BadRequestError('Name is required');

      const userLikedNames = nameContext.likedNames[userSystemId] || [];

      // Check if the name already exists in the array
      if (!userLikedNames.includes(name)) {
        userLikedNames.push(name);
        nameContext.likedNames[userSystemId] = userLikedNames;
      }

      const errors = nameContext.validateSync();

      if (errors) {
        res.status(400).send({ message: errors.message });
      }

      await nameContext.updateOne({ likedNames: nameContext.likedNames });
      logger.info(`Match ${name} added to name context ${id}`);
      const augmentedNameContext = await augmentParticipants(nameContext);
      res.status(201).send(trimNameContext(req, augmentedNameContext));
    } catch (err) {
      logger.error('Error adding match to name context:', err.message);
      next(err);
    }
  });

  router.patch('/nameContext/:id/removeNames', checkNameContextOwnerOrPartipant, async (req, res, next) => {
    const { id } = req.params;
    const { names } = req.body;
    const { nameContext } = req;
    const userSystemId = req.systemUser.id;

    try {
      // Check if the user has liked names
      const userLikedNames = nameContext.likedNames[userSystemId] || [];
      if (userLikedNames.length > 0) {
        // Remove the specified names from the user's liked names array
        const updatedLikedNames = _.without(userLikedNames, ...names);
        nameContext.likedNames[userSystemId] = updatedLikedNames;
      }

      const errors = nameContext.validateSync();

      if (errors) {
        throw new BadRequestError(errors.message);
      }

      await nameContext.updateOne({ likedNames: nameContext.likedNames });
      logger.info(`${names} removed from name context ${id}`);
      const augmentedNameContext = await augmentParticipants(nameContext);
      res.status(201).send(trimNameContext(req, augmentedNameContext));
    } catch (err) {
      logger.error('Error adding match to name context:', err.message);
      next(err);
    }
  });

  router.delete('/nameContext/:id', checkNameContextOwner, async (req, res, next) => {
    const { id } = req.params;
    try {
        await NameContext.deleteOne({ id });
        await Invitation.deleteMany({ nameContextId: id });
        logger.info(`Name context ${id} deleted`);
        res.status(204).send({ message: `Name context ${id} deleted` });
    } catch (error) {
        logger.error('Error deleting name context:', error.message);
        next(error);
    }
  });

  module.exports = router;