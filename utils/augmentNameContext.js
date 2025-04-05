const calculateMatches = require('./calculateMatches.js');

/**
 * A function to augment the name context with additional information
 * such as matches and ownership status.
 * @param {*} req
 * @param {*} nameContext
 * @returns augmented name context object ready to be sent to the client
 */
function augmentNameContext(req, nameContext) {
    const matches = calculateMatches(nameContext);

    const userId = req.systemUser.id;
    const likedNames = nameContext.likedNames?.[userId] || [];

    return {
        id: nameContext.id,
        name: nameContext.name,
        description: nameContext.description,
        noun: nameContext.noun,
        owner: nameContext.owner,
        participants: nameContext.participants,
        likedNames: likedNames,
        filter: nameContext.filter,
        matches: matches,
        updatedAt: nameContext.updatedAt,
        createdAt: nameContext.createdAt,
    }
}

module.exports = augmentNameContext;