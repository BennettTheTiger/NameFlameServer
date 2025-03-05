const checkNameContextOwnerOrPartipant = require('./checkNameContextOwnerOrParticipant');
const NameContext = require('../models/nameContext');
const { NotFoundError, ForbiddenError } = require('./errors');

jest.mock('../models/nameContext');

describe('checkNameContextOwnerOrPartipant Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      params: { id: 'contextId' },
      systemUser: { id: 'userId' }
    };
    res = {};
    next = jest.fn();
  });

  it('should call next if the user is the owner', async () => {
    NameContext.findOne.mockResolvedValue({ owner: 'userId', participants: [] });

    await checkNameContextOwnerOrPartipant(req, res, next);

    expect(NameContext.findOne).toHaveBeenCalledWith({ id: 'contextId' });
    expect(next).toHaveBeenCalledWith();
  });

  it('should call next if the user is a participant', async () => {
    NameContext.findOne.mockResolvedValue({ owner: 'otherUserId', participants: ['userId'] });

    await checkNameContextOwnerOrPartipant(req, res, next);

    expect(NameContext.findOne).toHaveBeenCalledWith({ id: 'contextId' });
    expect(next).toHaveBeenCalledWith();
  });

  it('should throw NotFoundError if the name context is not found', async () => {
    NameContext.findOne.mockResolvedValue(null);

    await checkNameContextOwnerOrPartipant(req, res, next);

    expect(NameContext.findOne).toHaveBeenCalledWith({ id: 'contextId' });
    expect(next).toHaveBeenCalledWith(expect.any(NotFoundError));
  });

  it('should throw ForbiddenError if the user is not authorized', async () => {
    NameContext.findOne.mockResolvedValue({ owner: 'otherUserId', participants: [] });

    await checkNameContextOwnerOrPartipant(req, res, next);

    expect(NameContext.findOne).toHaveBeenCalledWith({ id: 'contextId' });
    expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
  });

  it('should call next with an error if there is an error', async () => {
    const error = new Error('Database error');
    NameContext.findOne.mockRejectedValue(error);

    await checkNameContextOwnerOrPartipant(req, res, next);

    expect(NameContext.findOne).toHaveBeenCalledWith({ id: 'contextId' });
    expect(next).toHaveBeenCalledWith(error);
  });
});