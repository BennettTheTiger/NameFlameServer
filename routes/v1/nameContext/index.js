const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const NameContext = require('../../../models/nameContext');

router.get('/nameContext/:id', async (req, res) => {
    const { id } = req.params;

    if (!id) return res.status(400).send({ message: 'ID is required' });

    const nameContext = await NameContext.findOne({ id });
    res.status(200).send(nameContext);
  });

  router.patch('/nameContext/:id', async (req, res) => {
    const { id } = req.params;

    if (!id) return res.status(400).send({ message: 'ID is required' });

    const nameContext = await NameContext.findOne({ id });
    res.status(200).send(nameContext);
  });

  router.get('/nameContexts', async (req, res) => {

    const nameContexts = await NameContext.find({ owner: req.userData.id }).limit(20);
    res.status(200).send(nameContexts);
  });

  router.post('/nameContext', async (req, res) => {
    console.log('should add', req.body);

    const { name, description } = req.body;

    const newNameContext = new NameContext({
      name,
      description,
      owner: req.userData.id, // from authMiddleware
      id: uuidv4(),
      participants: [],
      filters: {},
      role: 'user'
    });

    const errors = newNameContext.validateSync();

    if (errors) {
      return res.status(400).send({ message: errors.message });
    }

    await newNameContext.save();
    res.status(201).send('Name context added');
  });

  router.delete('/nameContext/:id', async (req, res) => {
    const { id } = req.params;

    if (!id) return res.status(400).send({ message: 'Name ID is required' });

    try {
        const nameContext = await NameContext.findOne({ id });
        if (!nameContext) return res.status(404).send({ message: `Name context ${id} not found` });

        if (nameContext.owner !== req.userData.id) {
            return res.status(403).send({ message: 'You are not authorized to delete this name context' });
        }

        await NameContext.deleteOne({ id });
        res.status(204).send({ message: `Name ${id} deleted` });
    } catch (error) {
        console.log(error);
        res.status(500).send({ message: `Unable to delete name context ${id}` });
    }
  });

  module.exports = router;