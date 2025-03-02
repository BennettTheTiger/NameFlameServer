const request = require('supertest');
const express = require('express');
const admin = require('../../../firebase');
const User = require('../../../models/user');
const { v4: uuidv4 } = require('uuid');
const router = require('./register');
const { errorHandler } = require('../../../middleware/errors');

const app = express();
app.use(express.json());
app.use('/api/v1/auth', router);
app.use(errorHandler);

jest.mock('../../../models/user');
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
    admin.auth().getUserByEmail.mockResolvedValue(null);
    admin.auth().createUser.mockResolvedValue({ uid: 'firebaseUid' });
    User.findOne.mockResolvedValue(null);
    uuidv4.mockReturnValue('unique-id');
    User.prototype.validateSync = jest.fn().mockReturnValue(null);
    User.prototype.save = jest.fn().mockResolvedValue({});

    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'test@example.com', password: 'password123' });

    expect(admin.auth().getUserByEmail).toHaveBeenCalledWith('test@example.com');
    expect(admin.auth().createUser).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123'
    });
    expect(User.findOne).toHaveBeenCalledWith({ fireBaseUid: { $eq: 'firebaseUid' } });
    expect(User.prototype.save).toHaveBeenCalled();
    expect(res.status).toBe(200);
    expect(res.text).toBe('User registered successfully');
  });

  it('should return 200 and create mongoDb user if user already exists in Firebase but not mongo', async () => {
    admin.auth().getUserByEmail.mockResolvedValue({ uid: 'firebaseUid' });

    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'test@example.com', password: 'password123' });

    expect(admin.auth().getUserByEmail).toHaveBeenCalledWith('test@example.com');
    expect(res.status).toBe(200);
    expect(User.findOne).toHaveBeenCalledWith({ fireBaseUid: { $eq: 'firebaseUid' } });
    expect(User.prototype.save).toHaveBeenCalled();
  });

  it('should return 400 if user already exists in MongoDB', async () => {
    admin.auth().getUserByEmail.mockResolvedValue(null);
    admin.auth().createUser.mockResolvedValue({ uid: 'firebaseUid' });
    User.findOne.mockResolvedValue({ firebaseUid: 'firebaseUid' });

    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'test@example.com', password: 'password123' });

    expect(admin.auth().getUserByEmail).toHaveBeenCalledWith('test@example.com');
    expect(admin.auth().createUser).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123'
    });
    expect(User.findOne).toHaveBeenCalledWith({ fireBaseUid: { $eq: 'firebaseUid' } });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('User already exists, please login');
  });

  it('should return 400 if validation fails', async () => {
    admin.auth().getUserByEmail.mockResolvedValue(null);
    admin.auth().createUser.mockResolvedValue({ uid: 'firebaseUid' });
    User.findOne.mockResolvedValue(null);
    uuidv4.mockReturnValue('unique-id');
    const validationError = new Error('Validation error');
    User.prototype.validateSync = jest.fn().mockReturnValue(validationError);

    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'test@example.com', password: 'password123' });

    expect(admin.auth().getUserByEmail).toHaveBeenCalledWith('test@example.com');
    expect(admin.auth().createUser).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123'
    });
    expect(User.findOne).toHaveBeenCalledWith({ fireBaseUid: { $eq: 'firebaseUid' } });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Validation error');
  });

  it('should return 500 if there is a server error', async () => {
    admin.auth().getUserByEmail.mockRejectedValue(new Error('Server error'));

    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'test@example.com', password: 'password123' });

    expect(admin.auth().getUserByEmail).toHaveBeenCalledWith('test@example.com');
    expect(res.status).toBe(500);
    expect(res.body.message).toBe('Server error');
  });
});