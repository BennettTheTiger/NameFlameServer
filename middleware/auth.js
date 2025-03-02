const admin = require('../firebase');
const logger = require('../logger');
const { UnauthorizedError } = require('./errors');

module.exports = async (req, res, next) => {
  try {
    const token = req.headers.authorization.split(' ')[1];
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.userData = decodedToken;
    next();
  } catch (err) {
    logger.info('Error verifying token:', err.message);
    const error = new UnauthorizedError('Invalid token');
    next(error);
  }
};