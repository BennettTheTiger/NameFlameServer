const NameContext = require('../models/nameContext');
const { NotFoundError, ForbiddenError } = require('./errors');

/**
 * Ensures that the user is the owner of the name context before allowing edits
 * @param {*} req
 * @param {*} res
 * @param {*} next
 * @returns
 */
const checkNameContextOwner = async (req, res, next) => {
  const { id } = req.params;

  try {
    const nameContext = await NameContext.findOne({ id });
    if (!nameContext) {
      throw new NotFoundError(`Name context ${id} not found`);
    }

    if (nameContext.owner.toString() !== req.systemUser.id) {
      throw new ForbiddenError(`User is not the owner of name context ${id}`);
    }

    next();
  } catch (err) {
    next(err)
  }
};

module.exports = checkNameContextOwner;