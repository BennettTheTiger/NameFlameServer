const { io } = require('../server');
const calculateMatches = require('../utils/calculateMatches');

async function sendUpdateNameContextEvent(req, nameContext) {
    // Emit an event to all clients in the room for this NameContext
    const matches = calculateMatches(nameContext);
    io.to(`nameContext:${nameContext.id}`).emit('nameContextUpdated', {
        id: nameContext.id,
        name: nameContext.name,
        description: nameContext.description,
        noun: nameContext.noun,
        participants: nameContext.participants,
        filter: nameContext.filter,
        matches: matches,
        updatedAt: nameContext.updatedAt,
    });
}

module.exports = sendUpdateNameContextEvent;