const admin = require('../firebase');
const authMiddleware = require('./auth');
const { UnauthorizedError } = require('./errors');

jest.mock('../firebase', () => {
  const originalModule = jest.requireActual('firebase-admin');
  return {
    ...originalModule,
    auth: jest.fn().mockReturnValue({
      verifyIdToken: jest.fn()
    })
  };
});

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

  it('should call next if token is valid', async () => {
    const decodedToken = { uid: 'userId' };
    admin.auth().verifyIdToken.mockResolvedValue(decodedToken);

    await authMiddleware(req, res, next);

    expect(admin.auth().verifyIdToken).toHaveBeenCalledWith('validToken');
    expect(req.userData).toEqual(decodedToken);
    expect(next).toHaveBeenCalled();
  });

  it('should return 401 if token is invalid', async () => {
    admin.auth().verifyIdToken.mockRejectedValue(new Error('Invalid token'));

    await authMiddleware(req, res, next);

    expect(admin.auth().verifyIdToken).toHaveBeenCalledWith('validToken');
    expect(next).toHaveBeenCalledWith(new UnauthorizedError('Invalid token'));
  });

  it('should return 401 if no token is provided', async () => {
    req.headers.authorization = '';

    await authMiddleware(req, res, next);

    expect(next).toHaveBeenCalledWith(new UnauthorizedError('Invalid token'));
  });
});