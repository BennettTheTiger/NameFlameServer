const logger = require('../logger');

class BadRequestError extends Error {
    constructor(message) {
        super(message);
        this.name = 'BadRequestError';
        this.statusCode = 400;
    }
}

class ForbiddenError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ForbiddenError';
        this.statusCode = 403;
    }
}

class NotFoundError extends Error {
    constructor(message) {
        super(message);
        this.name = 'NotFoundError';
        this.statusCode = 404;
    }
}

class InternalServerError extends Error {
    constructor(message) {
        super(message);
        this.name = 'InternalServerError';
        this.statusCode = 500;
    }
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
    logger.error(err.stack);
    res.status(err.statusCode || 500).json({ error: err.message });
}

module.exports = {
    NotFoundError,
    BadRequestError,
    ForbiddenError,
    InternalServerError,
    errorHandler
};
