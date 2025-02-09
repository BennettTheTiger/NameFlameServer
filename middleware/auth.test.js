const jwt = require('jsonwebtoken');
const authMiddleware = require('./auth');

jest.mock('jsonwebtoken');

describe('Auth Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      headers: {
        authorization: 'Bearer validToken'
      }
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
  });

  it('should call next if token is valid', () => {
    const decodedToken = { id: 'userId' };
    jwt.verify.mockReturnValue(decodedToken);

    authMiddleware(req, res, next);

    expect(jwt.verify).toHaveBeenCalledWith('validToken', process.env.JWT_SECRET);
    expect(req.userData).toEqual(decodedToken);
    expect(next).toHaveBeenCalled();
  });

  it('should return 401 if token is invalid', () => {
    jwt.verify.mockImplementation(() => {
      throw new Error('Invalid token');
    });

    authMiddleware(req, res, next);

    expect(jwt.verify).toHaveBeenCalledWith('validToken', process.env.JWT_SECRET);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Authentication failed try Again' });
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 if no token is provided', () => {
    req.headers.authorization = '';

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Authentication failed try Again' });
    expect(next).not.toHaveBeenCalled();
  });
});