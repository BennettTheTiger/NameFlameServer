const express = require('express');
const router = express.Router();
const processNameResult = require('../names/utils');
const { v4: uuidv4 } = require('uuid');
const NameContext = require('../../../models/nameContext');
const Name = require('../../../models/name');
const checkNameContextOwner = require('../../../middleware/checkNameContextOwner');
const { NotFoundError, BadRequestError } = require('../../../middleware/errors');
const logger = require('../../../logger');
const checkNameContextOwnerOrPartipant = require('../../../middleware/checkNameContextOwnerOrParticipant');

function trimNameContext(req, nameContext) {
  const userId = req.systemUser.id;
  const result = nameContext.toObject();
  if (result.likedNames instanceof Map) {
    // only pick the liked names for the current user
    const likedNames = Object.fromEntries(result.likedNames);
    result.likedNames = likedNames[userId] || [];
  }
  delete result._id;
  delete result.owner;
  delete result.__v;
  return result;
}

router.get('/nameContext/:id', async (req, res, next) => {
    const { id } = req.params;

    try {
      const nameContext = await NameContext.findOne({ id });
      if (!nameContext) {
        throw new NotFoundError(`Name context ${id} not found`);
      }

      nameContext.setCurrentUserId(req.systemUser.id);
      const nameContextResult = trimNameContext(req, nameContext);
      res.status(200).send(nameContextResult);
    }
    catch (err) {
      next(err);
    }
  });

  router.get('/nameContexts', async (req, res, next) => {
    const nameContexts = await NameContext.find({ owner: req.systemUser.id });

    try {
      nameContexts.forEach(nameContext => nameContext.setCurrentUserId(req.systemUser.id));
      const result = nameContexts.map((item) => trimNameContext(req, item));
      res.status(200).send(result);
    }
    catch (err) {
      logger.error('Error getting name contexts:', err.message);
      next(err);
    }
  });

  router.post('/nameContext', async (req, res, next) => {
    const { name, description, filters, noun } = req.body;

    try {
      const newNameContext = new NameContext({
        name,
        description,
        noun,
        owner: req.systemUser.id, // from addSystemUser middleware
        id: uuidv4(),
        participants: [], // TODO add participants
        filters: filters
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
    const { name, description, filter, participants } = req.body;

    try {
      const nameContext = req.nameContext;

      // Update fields if they are present in the request body
      if (name) nameContext.name = name;
      if (description) nameContext.description = description;
      if (filter) nameContext.filter = filter;
      if (participants) nameContext.participants = participants;

      const errors = nameContext.validateSync();
      if (errors) {
        return res.status(400).send({ message: errors.message });
      }

      await nameContext.save();
      const result = trimNameContext(req, nameContext);
      res.status(200).send(result);
    } catch (err) {
      logger.error('Error updating name context:', err.message);
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
    const userLikedNames = likedNames.get(req.systemUser.id) || [];
    if (userLikedNames.length > 0) {
      mongoQuery.name = { ...mongoQuery.name, $nin: userLikedNames };
    }

    const sizeLimit = Math.min(parseInt(limit || 0, 10), 50);

    const names = await Name.aggregate([
      { $match: mongoQuery },
      { $sample: { size: sizeLimit } } // Randomly sample the results
    ]);

     const processNameResults = names.map(processNameResult);
    // Return the filtered names
    res.status(200).send(processNameResults);
  } catch (err) {
    logger.error('Error fetching next set of names:', err.message);
    next(err);
  }
});

  router.patch('/nameContext/:id/match', checkNameContextOwnerOrPartipant, async (req, res, next) => {
    const { id } = req.params;
    const { name } = req.body;
    const userSystemId = req.systemUser.id;

    try {
      if (!name) throw new BadRequestError('Name is required');

      const nameContext = await NameContext.findOne({ id });

      // Ensure likedNames is initialized
      if (!nameContext.likedNames) {
        nameContext.likedNames = new Map();
      }

      // Add the name to the likedNames array with the user's ID as the key
      if (!nameContext.likedNames.has(userSystemId)) {
        nameContext.likedNames.set(userSystemId, []);
      }

      const userLikedNames = nameContext.likedNames.get(userSystemId);

      // Check if the name already exists in the array
      if (!userLikedNames.includes(name)) {
        userLikedNames.push(name);
      }

      const errors = nameContext.validateSync();

      if (errors) {
        res.status(400).send({ message: errors.message });
      }

      await nameContext.save();
      logger.info(`Match ${name} added to name context ${id}`);
      res.status(201).send(trimNameContext(req, nameContext));
    } catch (err) {
      logger.error('Error adding match to name context:', err.message);
      next(err);
    }
  });

  router.patch('/nameContext/:id/removeNames', checkNameContextOwnerOrPartipant, async (req, res, next) => {
    const { id } = req.params;
    const { names } = req.body;
    const userSystemId = req.systemUser.id;

    try {
      const nameContext = await NameContext.findOne({ id });

      // Ensure likedNames is initialized
      if (!nameContext.likedNames) {
        nameContext.likedNames = new Map();
      }

      // Check if the user has liked names
      if (nameContext.likedNames.has(userSystemId)) {
        // Remove the specified names from the user's liked names array
        const updatedLikedNames = nameContext.likedNames.get(userSystemId).filter(name => !names.includes(name));
        nameContext.likedNames.set(userSystemId, updatedLikedNames);
      }

      const errors = nameContext.validateSync();

      if (errors) {
        throw new BadRequestError(errors.message);
      }

      await nameContext.save();
      logger.info(`${names} removed from name context ${id}`);
      res.status(201).send(trimNameContext(req, nameContext));
    } catch (err) {
      logger.error('Error adding match to name context:', err.message);
      next(err);
    }
  });

  router.delete('/nameContext/:id', checkNameContextOwner, async (req, res, next) => {
    const { id } = req.params;
    try {
        await NameContext.deleteOne({ id });
        logger.info(`Name context ${id} deleted`);
        res.status(204).send({ message: `Name context ${id} deleted` });
    } catch (error) {
        logger.error('Error deleting name context:', error.message);
        next(error);
    }
  });

  module.exports = router;