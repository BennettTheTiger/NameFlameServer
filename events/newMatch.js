const { io } = require('../server');

async function sendNewMatchEvent(req, nameContext, newMatch) {
    // Emit an event to all clients in the room for this NameContext
    io.to(`nameContext:${nameContext.id}`).emit('newMatch', {
        id: nameContext.id,
        name: nameContext.name,
        newMatch: newMatch,
    });
}

module.exports = sendNewMatchEvent;