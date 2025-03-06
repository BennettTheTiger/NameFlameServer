
const _ = require('lodash');
const Name = require('../../../models/name');

module.exports = function processNameResult(nameResult) {
    const nameDoc = new Name(nameResult);
    const nameWithVirtuals = nameDoc.toObject({ virtuals: true });
    // Convert Map to plain object
    if (nameWithVirtuals.popularity instanceof Map) {
      nameWithVirtuals.popularity = Object.fromEntries(nameWithVirtuals.popularity);
    }
    return _.omit(nameWithVirtuals, ['_id', '__v', 'id']);
  }