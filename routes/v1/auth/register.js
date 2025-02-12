const User = require('../../../models/user');
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

router.post('/register', async (req, res) => {
  const { email, password, userName, firstName, lastName } = req.body;
  try {
    const existingUser = await User.findOne({ userName: { $eq: userName } });
    if (existingUser) return res.status(400).send({ message: 'User already exists' });

    const newUser = new User({
        userName,
        email,
        password,
        firstName,
        lastName,
        id: uuidv4(),
        role: 'user'
    });

    const errors = newUser.validateSync();

    if (errors) {
        return res.status(400).send({ message: errors.message });
    }

    const existingUserName = await User.findOne({ userName: { $eq: userName } });
    if (existingUserName) return res.status(400).send({ message: `The username ${userName} is already taken.` });

    const salt = await bcrypt.genSalt(10);
    newUser.password = await bcrypt.hash(password, salt);

    await newUser.save();

    const payload = {
        user: { id: newUser.id }
    };

    jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: 3600 }, (err, token) => {
        if (err) throw err;
        res.json({ token });
    })

    res.status(201).send({ message: 'User registered successfully' });
  } catch (err) {
        console.error(err.message);
        res.status(500).send();
}
});

module.exports = router;