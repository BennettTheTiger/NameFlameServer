const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const _ = require('lodash');

const User = require('../../../models/user');

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
      // Check if the user exists
      let user = await User.findOne({ email });
      if (!user) {
          return res.status(400).json({ msg: 'Invalid credentials' });
      }

      // Validate password
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
          return res.status(400).json({ msg: 'Invalid credentials' });
      }

      // Generate JWT token
      const payload = _.pick(user, ['id', 'userName', 'role']);

      jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: 3600 },
      (err, token) => {
          if (err) throw err;
          res.json({ token });
      });
  } catch (err) {
      console.log(err.message);
      res.status(500).send('Server Error');
  }
});

module.exports = router;
