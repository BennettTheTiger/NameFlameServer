const { NotFoundError, BadRequestError, ForbiddenError, InternalServerError, errorHandler } = require('./errors');
const logger = require('../logger');

jest.mock('../logger');

describe('Custom Error Classes', () => {
  it('should create a BadRequestError with the correct properties', () => {
    const error = new BadRequestError('Bad request');
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('BadRequestError');
    expect(error.statusCode).toBe(400);
    expect(error.message).toBe('Bad request');
  });

  it('should create a ForbiddenError with the correct properties', () => {
    const error = new ForbiddenError('Forbidden');
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('ForbiddenError');
    expect(error.statusCode).toBe(403);
    expect(error.message).toBe('Forbidden');
  });

  it('should create a NotFoundError with the correct properties', () => {
    const error = new NotFoundError('Not found');
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('NotFoundError');
    expect(error.statusCode).toBe(404);
    expect(error.message).toBe('Not found');
  });

  it('should create an InternalServerError with the correct properties', () => {
    const error = new InternalServerError('Internal server error');
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('InternalServerError');
    expect(error.statusCode).toBe(500);
    expect(error.message).toBe('Internal server error');
  });
});

describe('Error Handling Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {};
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
  });

  it('should log the error and send a 400 response for BadRequestError', () => {
    const error = new BadRequestError('Bad request');
    errorHandler(error, req, res, next);
    expect(logger.error).toHaveBeenCalledWith(error.stack);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Bad request' });
  });

  it('should log the error and send a 403 response for ForbiddenError', () => {
    const error = new ForbiddenError('Forbidden');
    errorHandler(error, req, res, next);
    expect(logger.error).toHaveBeenCalledWith(error.stack);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Forbidden' });
  });

  it('should log the error and send a 404 response for NotFoundError', () => {
    const error = new NotFoundError('Not found');
    errorHandler(error, req, res, next);
    expect(logger.error).toHaveBeenCalledWith(error.stack);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Not found' });
  });

  it('should log the error and send a 500 response for InternalServerError', () => {
    const error = new InternalServerError('Internal server error');
    errorHandler(error, req, res, next);
    expect(logger.error).toHaveBeenCalledWith(error.stack);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' });
  });

  it('should log the error and send a 500 response for an unknown error', () => {
    const error = new Error('Unknown error');
    errorHandler(error, req, res, next);
    expect(logger.error).toHaveBeenCalledWith(error.stack);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Unknown error' });
  });
});