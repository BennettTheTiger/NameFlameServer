const NameContext = require('../models/nameContext');

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
      return res.status(404).send({ message: `Name context ${id} not found` });
    }

    if (nameContext.owner.toString() !== req.userData.id) {
      return res.status(403).send({ message: 'You are not authorized to access this name context' });
    }

    next();
  } catch (err) {
    console.error(`Error checking name context owner:`, err.message);
    return res.status(500).send({ message: 'Server error' });
  }
};

module.exports = checkNameContextOwner;