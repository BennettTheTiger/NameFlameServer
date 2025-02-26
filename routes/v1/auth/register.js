const User = require('../../../models/user');
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { BadRequestError } = require('../../../middleware/errors');
const logger = require('../../../logger');

router.post('/register', async (req, res, next) => {
    try {
        const { email, password, userName, firstName, lastName } = req.body;

        const existingUser = await User.findOne({ userName: { $eq: userName } });
        if (existingUser) {
            logger.info(`User ${userName} already exists`);
            throw new BadRequestError(`The username ${userName} is already taken.`);
        }

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
            res.status(400).send({ message: errors.message });
        }

        const salt = await bcrypt.genSalt(10);
        newUser.password = await bcrypt.hash(password, salt);

        await newUser.save();

        res.status(200).send({ message: 'User registered successfully' });
    } catch (err) {
        next(err);
    }
});

module.exports = router;