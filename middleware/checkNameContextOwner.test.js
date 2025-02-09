const checkNameContextOwner = require('./checkNameContextOwner');
const NameContext = require('../models/nameContext');

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

    expect(NameContext.findOne).toHaveBeenCalledWith({ id: 'contextId' });
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.send).toHaveBeenCalledWith({ message: 'Name context contextId not found' });
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 403 if user is not the owner', async () => {
    const nameContext = { owner: 'otherUserId' };
    NameContext.findOne.mockResolvedValue(nameContext);

    await checkNameContextOwner(req, res, next);

    expect(NameContext.findOne).toHaveBeenCalledWith({ id: 'contextId' });
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.send).toHaveBeenCalledWith({ message: 'You are not authorized to access this name context' });
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 500 if there is a server error', async () => {
    NameContext.findOne.mockRejectedValue(new Error('Server error'));

    await checkNameContextOwner(req, res, next);

    expect(NameContext.findOne).toHaveBeenCalledWith({ id: 'contextId' });
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({ message: 'Server error' });
    expect(next).not.toHaveBeenCalled();
  });
});