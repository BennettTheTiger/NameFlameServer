const request = require('supertest');
const express = require('express');
const admin = require('../../../firebase');
const User = require('../../../models/user');
const router = require('./login');
const { errorHandler } = require('../../../middleware/errors');

const app = express();
app.use(express.json());
app.use('/api/v1/auth', router);
app.use(errorHandler);

jest.mock('../../../models/user');
jest.mock('../../../firebase', () => ({
  auth: jest.fn().mockReturnThis(),
  getUserByEmail: jest.fn(),
  createCustomToken: jest.fn()
}));
jest.mock('../../../logger');

describe('POST /api/v1/auth/login', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 200 and a token if login is successful', async () => {
    const userRecord = { uid: 'firebaseUid' };
    const user = { id: '1', userName: 'testuser', email: 'test@example.com' };
    admin.auth().getUserByEmail.mockResolvedValue(userRecord);
    admin.auth().createCustomToken.mockResolvedValue('firebaseToken');
    User.findOne.mockResolvedValue(user);

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'test@example.com' });

    expect(admin.auth().getUserByEmail).toHaveBeenCalledWith('test@example.com');
    expect(admin.auth().createCustomToken).toHaveBeenCalledWith('firebaseUid');
    expect(User.findOne).toHaveBeenCalledWith({ email: { $eq: 'test@example.com' } });
    expect(res.status).toBe(200);
    expect(res.body.token).toBe('firebaseToken');
    expect(res.body.user).toEqual(user);
  });

  it('should return 400 if user is not found in MongoDB', async () => {
    const userRecord = { uid: 'firebaseUid' };
    admin.auth().getUserByEmail.mockResolvedValue(userRecord);
    admin.auth().createCustomToken.mockResolvedValue('firebaseToken');
    User.findOne.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'test@example.com' });

    expect(admin.auth().getUserByEmail).toHaveBeenCalledWith('test@example.com');
    expect(admin.auth().createCustomToken).toHaveBeenCalledWith('firebaseUid');
    expect(User.findOne).toHaveBeenCalledWith({ email: { $eq: 'test@example.com' } });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid credentials');
  });

  it('should return 500 if there is a server error', async () => {
    admin.auth().getUserByEmail.mockRejectedValue(new Error('Server error'));

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'test@example.com' });

    expect(admin.auth().getUserByEmail).toHaveBeenCalledWith('test@example.com');
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Server error');
  });
});