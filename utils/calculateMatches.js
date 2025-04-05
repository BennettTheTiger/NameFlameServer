const _ = require('lodash');

function calculateMatches(nameContext) {
    // Check if likedNames is initialized
    if (!nameContext.likedNames) {
        return [];
    }

    // Get the liked names from all participants
    const likedNames = Object.values(nameContext.likedNames);

    // Calculate the intersection of all liked names
    const intersection = _.intersection(...likedNames);

    return intersection;

}

module.exports = calculateMatches;