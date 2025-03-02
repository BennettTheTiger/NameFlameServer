const addSystemUser = require('./addSystemUser');
const User = require('../models/user');
const logger = require('../logger');
const { InternalServerError } = require('./errors');
const { v4: uuidv4 } = require('uuid');

jest.mock('../models/user');
jest.mock('../logger');
jest.mock('uuid', () => ({ v4: jest.fn() }));

describe('addSystemUser Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      userData: {
        uid: 'firebaseUid',
        email: 'test@example.com',
        name: 'testuser'
      }
    };
    res = {};
    next = jest.fn();
  });

  it('should assign existing user to req.systemUser if user exists', async () => {
    const existingUser = { id: '1', email: 'test@example.com', firebaseUid: 'firebaseUid' };
    User.findOne.mockResolvedValue(existingUser);

    await addSystemUser(req, res, next);

    expect(User.findOne).toHaveBeenCalledWith({ 'firebaseUid': { $eq: 'firebaseUid' } });
    expect(req.systemUser).toEqual(existingUser);
    expect(next).toHaveBeenCalled();
  });

  it('should create a new user and assign to req.systemUser if user does not exist', async () => {
    User.findOne.mockResolvedValue(null);
    uuidv4.mockReturnValue('unique-id');
    User.prototype.validateSync = jest.fn().mockReturnValue(null);
    User.prototype.save = jest.fn().mockResolvedValue({});
    User.prototype.toObject = jest.fn().mockReturnValue({
      email: 'test@example.com',
      id: 'unique-id',
      firebaseUid: 'firebaseUid'
    });

    await addSystemUser(req, res, next);

    expect(User.findOne).toHaveBeenCalledWith({ 'firebaseUid': { $eq: 'firebaseUid' } });
    expect(User.prototype.save).toHaveBeenCalled();
    expect(req.systemUser).toEqual(expect.objectContaining({
      email: 'test@example.com',
      id: 'unique-id',
      firebaseUid: 'firebaseUid'
    }));
    expect(next).toHaveBeenCalled();
  });

  it('should handle validation errors when creating a new user', async () => {
    User.findOne.mockResolvedValue(null);
    const validationError = new Error('Validation error');
    User.prototype.validateSync = jest.fn().mockReturnValue(validationError);

    await addSystemUser(req, res, next);

    expect(User.findOne).toHaveBeenCalledWith({ 'firebaseUid': { $eq: 'firebaseUid' } });
    expect(next).toHaveBeenCalledWith(new InternalServerError('Unable to find user in the system'));
  });

  it('should handle errors when finding user in the system', async () => {
    User.findOne.mockRejectedValue(new Error('Database error'));

    await addSystemUser(req, res, next);

    expect(User.findOne).toHaveBeenCalledWith({ 'firebaseUid': { $eq: 'firebaseUid' } });
    expect(logger.info).toHaveBeenCalledWith('Error finding user in the system:', 'Database error');
    expect(next).toHaveBeenCalledWith(new InternalServerError('Unable to find user in the system'));
  });
});