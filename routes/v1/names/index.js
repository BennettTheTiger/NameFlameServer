const express = require('express');
const router = express.Router();
const Name = require('../../../models/name');

router.get('/names', async (req, res) => {
    const { gender, origin } = req.query;
    const query = {};

    if (gender) query.gender = gender;
    if (origin) query.origin = origin;

    const names = await Name.find(query).limit(50);
    res.status(200).send(names);
  });

  router.post('/name', async (req, res) => {
    const { gender, origin } = req.query;
    const query = {};

    if (gender) query.gender = gender;
    if (origin) query.origin = origin;

    const names = await Name.find(query).limit(50);
    res.status(201).send(names);
  });
