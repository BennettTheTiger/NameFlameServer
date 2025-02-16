const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const NameContext = require('../../../models/nameContext');
const checkNameContextOwner = require('../../../middleware/checkNameContextOwner');

function trimNameContext(nameContext) {
  const result = nameContext.toObject();
  delete result._id;
  delete result.owner;
  delete result.__v;
  return result;
}

router.get('/nameContext/:id', async (req, res) => {
    const { id } = req.params;

    if (!id) return res.status(400).send({ message: 'ID is required' });

    const nameContext = await NameContext.findOne({ id });
    // Set the current user ID to use in the virtual field
    nameContext.setCurrentUserId(req.userData.id);
    const nameContextResult = trimNameContext(nameContext);
    res.status(200).send(nameContextResult);
  });

  router.get('/nameContexts', async (req, res) => {
    const nameContexts = await NameContext.find({ owner: req.userData.id }).limit(20);

    // Set the current user ID for each nameContext to use in the virtual field
    nameContexts.forEach(nameContext => nameContext.setCurrentUserId(req.userData.id));

    res.status(200).send(nameContexts.map(trimNameContext));
  });

  router.post('/nameContext', async (req, res) => {
    console.log('should add', req.body);

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
      const result = trimNameContext(nameContext);
      res.status(200).send(result);
    } catch (err) {
      console.error('Error updating name context %s:', id, err.message);
      res.status(500).send({ message: 'Server error' });
    }
  });

  router.patch('/nameContext/:id/match', async (req, res) => {
    const { id } = req.params;
    const { name } = req.body;

    if (!name) return res.status(400).send({ message: 'Name is required' });

    const nameContext = await NameContext.findOne({ id });

    if (!nameContext) { return res.status(404).send({ message: `Name context ${id} not found` }); }

    if (!nameContext.participants.includes(req.userData.id) && nameContext.owner.toString() !== req.userData.id) {
      return res.status(403).send({ message: 'You are not authorized to participate with this name context.' });
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
      return res.status(400).send({ message: errors.message });
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
        console.log(error);
        res.status(500).send({ message: `Unable to delete name context ${id}` });
    }
  });

  module.exports = router;