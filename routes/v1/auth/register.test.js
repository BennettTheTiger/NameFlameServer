const request = require('supertest');
const express = require('express');
const admin = require('../../../firebase');
const User = require('../../../models/user');
const { v4: uuidv4 } = require('uuid');
const router = require('./register');
const { errorHandler } = require('../../../middleware/errors');
const Invitation = require('../../../models/invitations');

const app = express();
app.use(express.json());
app.use('/api/v1/auth', router);
app.use(errorHandler);

jest.mock('../../../models/user');
jest.mock('../../../models/invitations');
jest.mock('../../../firebase', () => ({
  auth: jest.fn().mockReturnThis(),
  getUserByEmail: jest.fn(),
  createUser: jest.fn()
}));
jest.mock('uuid', () => ({ v4: jest.fn() }));
jest.mock('../../../logger');

describe('POST /api/v1/auth/register', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 200 if registration is successful', async () => {
    admin.auth().getUserByEmail.mockRejectedValue(new Error('User not found'));
    admin.auth().createUser.mockResolvedValue({ uid: 'firebaseUid' });
    User.findOne.mockResolvedValue(null);
    Invitation.find.mockResolvedValue([]);
    uuidv4.mockReturnValue('unique-id');
    User.prototype.validateSync = jest.fn().mockReturnValue(null);
    User.prototype.save = jest.fn().mockResolvedValue({});

    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'test@example.com', password: 'password123', userName: 'testuser' });

    expect(admin.auth().getUserByEmail).toHaveBeenCalledWith('test@example.com');
    expect(admin.auth().createUser).toHaveBeenCalledWith({
      displayName: 'testuser',
      email: 'test@example.com',
      password: 'password123'
    });
    expect(User.findOne).toHaveBeenCalledWith({ firebaseUid: { $eq: 'firebaseUid' } });
    expect(User.prototype.save).toHaveBeenCalled();
    expect(res.status).toBe(200);
    expect(res.text).toBe('User registered successfully');
  });

  it('should return 200 and create MongoDB user if user already exists in Firebase but not MongoDB', async () => {
    admin.auth().getUserByEmail.mockResolvedValue({ uid: 'firebaseUid' });
    User.findOne.mockResolvedValue(null);
    Invitation.find.mockResolvedValue([]);
    uuidv4.mockReturnValue('unique-id');
    User.prototype.validateSync = jest.fn().mockReturnValue(null);
    User.prototype.save = jest.fn().mockResolvedValue({});

    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'test@example.com', password: 'password123', userName: 'testuser' });

    expect(admin.auth().getUserByEmail).toHaveBeenCalledWith('test@example.com');
    expect(User.findOne).toHaveBeenCalledWith({ firebaseUid: { $eq: 'firebaseUid' } });
    expect(User.prototype.save).toHaveBeenCalled();
    expect(res.status).toBe(200);
    expect(res.text).toBe('User registered successfully');
  });

  it('should return 400 if user already exists in MongoDB', async () => {
    admin.auth().getUserByEmail.mockResolvedValue({ uid: 'firebaseUid' });
    User.findOne.mockResolvedValue({ firebaseUid: 'firebaseUid' });

    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'test@example.com', password: 'password123', userName: 'testuser' });

    expect(admin.auth().getUserByEmail).toHaveBeenCalledWith('test@example.com');
    expect(User.findOne).toHaveBeenCalledWith({ firebaseUid: { $eq: 'firebaseUid' } });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('User already exists, please login');
  });

  it('should return 400 if validation fails', async () => {
    admin.auth().getUserByEmail.mockRejectedValue(new Error('User not found'));
    admin.auth().createUser.mockResolvedValue({ uid: 'firebaseUid' });
    User.findOne.mockResolvedValue(null);
    uuidv4.mockReturnValue('unique-id');
    const validationError = new Error('Validation error');
    User.prototype.validateSync = jest.fn().mockReturnValue(validationError);

    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'test@example.com', password: 'password123', userName: 'testuser' });

    expect(admin.auth().getUserByEmail).toHaveBeenCalledWith('test@example.com');
    expect(admin.auth().createUser).toHaveBeenCalledWith({
      displayName: 'testuser',
      email: 'test@example.com',
      password: 'password123'
    });
    expect(User.findOne).toHaveBeenCalledWith({ firebaseUid: { $eq: 'firebaseUid' } });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Validation error');
  });

  // not sure why this is failing because when I run the test in the degugger it passes
  it('should return 400 if there is a error', async () => {
      admin.auth().getUserByEmail.mockRejectedValue(new Error('Failed to retrieve or create user'));

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ email: 'test@example.com', password: 'password123', userName: 'testuser' });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Validation error');
  });
});