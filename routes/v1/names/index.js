const express = require('express');
const router = express.Router();
const Name = require('../../../models/name');
const { NotFoundError } = require('../../../middleware/errors');
const processNameResult = require('./utils');

router.get('/names', async (req, res) => {
    const names = await Name.find();
    res.status(200).send(names);
  });

router.get('/name/random', async (req, res, next) => {
  try {
    const randomName = await Name.aggregate([{ $sample: { size: 1 } }]);
    if (randomName.length > 0) {
      const response = processNameResult(randomName[0]);
      res.status(200).send(response);
    }
    else throw new NotFoundError('No names found');
  } catch (err) {
    next(err);
  }
});

router.get('/name/:value', async (req, res, next) => {
  const { value } = req.params;
  try {
    const nameResult = await Name.findOne({ name: { $eq: value } });
    if (nameResult) {
      const response = processNameResult(nameResult);
      res.status(200).send(response);
    }
    else throw new NotFoundError(`Name ${value} not found`);
  } catch (err) {
    next(err);
  }
});

// Internal route to be disabled unless admin permissions are granted
/*
router.put('/name', async (req, res) => {
  const { gender, name, year, count } = req.body;
  console.log(`Request to add/update name: ${name}`);

  try {
    const nameResult = await Name.findOne({ name });

    if (!nameResult) {
      console.log(`Name ${name} updated/created successfully`);
      const newName = new Name({ name, popularity: {[year]: { [gender]: count } } });
      await newName.save();
      return res.status(200).send({ message: `${name} updated/created successfully` });
    } else {
      await nameResult.updateOne({ $set: { [`popularity.${year}.${gender}`]: count } });
      console.log(`updated/create name ${name}`);
      return res.status(201).send({ message:  'Updated' + name });
    }
  } catch (err) {
    console.error(`Error updating/creating name ${name}:`, err.message);
    return res.status(400).send({ message: err.message });
  }
});
  */

  module.exports = router;
