const NameContext = require('../models/nameContext');
const { NotFoundError, ForbiddenError } = require('./errors');

/**
 * Ensures that the user is the owner of the name context before allowing edits
 * @param {*} req
 * @param {*} res
 * @param {*} next
 * @returns
 */
const checkNameContextOwnerOrPartipant = async (req, res, next) => {
  const { id } = req.params;

  try {
    const nameContext = await NameContext.findOne({ id });
    req.nameContext = nameContext; // the name context to the request object
    if (!nameContext) {
      throw new NotFoundError(`Name context ${id} not found`);
    }

    if (nameContext.owner.toString() === req.systemUser.id) {
        return next();
    }

    if (nameContext.participants.includes(req.systemUser.id)) {
        return next();
    }

    throw new ForbiddenError('User is not authorized for this name context');
  } catch (err) {
    next(err)
  }
};

module.exports = checkNameContextOwnerOrPartipant;