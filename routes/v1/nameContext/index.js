const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const _ = require('lodash');
const NameContext = require('../../../models/nameContext');
const checkNameContextOwner = require('../../../middleware/checkNameContextOwner');
const { NotFoundError, InternalServerError, BadRequestError, ForbiddenError } = require('../../../middleware/errors');
const logger = require('../../../logger');

function trimNameContext(req, nameContext) {
  const userId = req.userData.id;
  const result = nameContext.toObject();
  if (result.likedNames instanceof Map) {
    // only pick the liked names for the current user
    result.likedNames = _.pick(Object.fromEntries(result.likedNames), [userId]);
  }
  delete result._id;
  delete result.owner;
  delete result.__v;
  return result;
}

router.get('/nameContext/:id', async (req, res) => {
    const { id } = req.params;

    const nameContext = await NameContext.findOne({ id });
    if (!nameContext) {
      throw new NotFoundError(`Name context ${id} not found`);
    }

    try {
      nameContext.setCurrentUserId(req.userData.id);
      const nameContextResult = trimNameContext(req, nameContext);
      res.status(200).send(nameContextResult);
    }
    catch (err) {
      logger.error(`Error getting name context ${id}:`, err.message);
      throw new InternalServerError('Error getting name context');
    }
  });

  router.get('/nameContexts', async (req, res) => {
    const nameContexts = await NameContext.find({ owner: req.userData.id });

    try {
      nameContexts.forEach(nameContext => nameContext.setCurrentUserId(req.userData.id));
      const result = nameContexts.map((item) => trimNameContext(req, item));
      res.status(200).send(result);
    }
    catch (err) {
      logger.error('Error getting name contexts:', err.message);
      throw new InternalServerError('Error getting name contexts');
    }
  });

  router.post('/nameContext', async (req, res) => {
    const { name, description, filters, noun } = req.body;

    const newNameContext = new NameContext({
      name,
      description,
      noun,
      owner: req.userData.id, // from authMiddleware
      id: uuidv4(),
      participants: [], // TODO add participants
      filters: filters
    });

    const errors = newNameContext.validateSync();

    if (errors) {
      return res.status(400).send({ message: errors.message });
    }

    await newNameContext.save();
    res.status(201).send('Name context added');
  });

  router.patch('/nameContext/:id', checkNameContextOwner, async (req, res) => {
    const { id } = req.params;
    const { name, description, filter, participants } = req.body;

    try {

      const nameContext = await NameContext.findOne({ id });

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
      logger.error(`Error updating name context ${id}:`, err.message);
      throw new InternalServerError('Error updating name context');
    }
  });

  router.patch('/nameContext/:id/match', async (req, res) => {
    const { id } = req.params;
    const { name } = req.body;

    if (!name) throw new BadRequestError('Name is required');

    const nameContext = await NameContext.findOne({ id });

    if (!nameContext) throw new NotFoundError(`Name context ${id} not found`);

    if (!nameContext.participants.includes(req.userData.id) && nameContext.owner.toString() !== req.userData.id) {
      throw new ForbiddenError(`User is not a participant of name context ${id}`);
    }

    // Ensure likedNames is initialized
    if (!nameContext.likedNames) {
      nameContext.likedNames = new Map();
    }

    // Add the name to the likedNames array with the user's ID as the key
    if (!nameContext.likedNames.has(req.userData.id)) {
      nameContext.likedNames.set(req.userData.id, []);
    }

    nameContext.likedNames.get(req.userData.id).push(name);

    const errors = nameContext.validateSync();

    if (errors) {
      res.status(400).send({ message: errors.message });
    }

    await nameContext.save();
    res.status(201).send(nameContext.toObject());
  });

  router.delete('/nameContext/:id', checkNameContextOwner, async (req, res) => {
    const { id } = req.params;
    try {
        await NameContext.deleteOne({ id });
        res.status(204).send({ message: `Name context ${id} deleted` });
    } catch (error) {
        logger.error(`Error deleting name context ${id}:`, error.message);
        throw new InternalServerError(`Error deleting name context ${id}`);
    }
  });

  module.exports = router;