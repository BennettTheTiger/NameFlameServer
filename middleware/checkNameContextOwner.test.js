const checkNameContextOwner = require('./checkNameContextOwner');
const NameContext = require('../models/nameContext');
const { NotFoundError, ForbiddenError, InternalServerError } = require('./errors');

jest.mock('../models/nameContext');

describe('Check Name Context Owner Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      params: { id: 'contextId' },
      userData: { id: 'userId' }
    };
    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn()
    };
    next = jest.fn();
  });

  it('should call next if user is the owner', async () => {
    const nameContext = { owner: 'userId' };
    NameContext.findOne.mockResolvedValue(nameContext);

    await checkNameContextOwner(req, res, next);

    expect(NameContext.findOne).toHaveBeenCalledWith({ id: 'contextId' });
    expect(next).toHaveBeenCalled();
  });

  it('should return 404 if name context is not found', async () => {
    NameContext.findOne.mockResolvedValue(null);

    await checkNameContextOwner(req, res, next);
    const expectedError = new NotFoundError('Name context contextId not found');

    expect(NameContext.findOne).toHaveBeenCalledWith({ id: 'contextId' });
    expect(next).toHaveBeenCalledWith(expectedError);
  });

  it('should return 403 if user is not the owner', async () => {
    const nameContext = { owner: 'otherUserId' };
    NameContext.findOne.mockResolvedValue(nameContext);

    await checkNameContextOwner(req, res, next);
    const expectedError = new ForbiddenError('User is not the owner of name context contextId');

    expect(NameContext.findOne).toHaveBeenCalledWith({ id: 'contextId' });
    expect(next).toHaveBeenCalledWith(expectedError);
  });

  it('should return 500 if there is a server error', async () => {
    NameContext.findOne.mockRejectedValue(new Error('Server error'));

    await checkNameContextOwner(req, res, next);
    const expectedError = new InternalServerError('Server error');

    expect(NameContext.findOne).toHaveBeenCalledWith({ id: 'contextId' });
    expect(next).toHaveBeenCalledWith(expectedError);
  });
});