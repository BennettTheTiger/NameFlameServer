const request = require('supertest');
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const User = require('../../../models/user');
const router = require('./register');

const app = express();
app.use(express.json());
app.use('/api/v1/auth', router);

jest.mock('bcryptjs');
jest.mock('jsonwebtoken');
jest.mock('uuid', () => ({ v4: jest.fn() }));
jest.mock('../../../models/user');

let server;
let agent;

beforeAll(() => {return new Promise(done => {
  server = app.listen(done);
  agent = request.agent(server);
})});

afterAll(() => {return new Promise(done => {
  server.close(done);
})});

describe('POST /api/v1/auth/register', () => {
  it('should return 400 if user already exists', async () => {
    User.findOne.mockResolvedValue({ email: 'test@example.com' });

    const res = await agent
      .post('/api/v1/auth/register')
      .send({ userName: 'testuser', email: 'test@example.com', password: 'password123' });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('User already exists');
  });

  it('should return 400 if user validation fails', async () => {
    User.findOne.mockResolvedValue(null);
    const validationError = new Error('Validation error');
    validationError.errors = { userName: { message: 'User name is required' } };
    User.prototype.validateSync = jest.fn().mockReturnValue(validationError);

    const res = await agent
      .post('/api/v1/auth/register')
      .send({ userName: '', email: 'test@example.com', password: 'password123' });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Validation error');
  });

  it('should return 200 and a token if registration is successful', async () => {
    User.findOne.mockResolvedValue(null);
    bcrypt.hash.mockResolvedValue('hashedpassword');
    uuidv4.mockReturnValue('unique-id');
    User.prototype.validateSync = jest.fn().mockReturnValue(null);
    User.prototype.save = jest.fn().mockResolvedValue({});
    jwt.sign.mockImplementation((payload, secret, options, callback) => {
      callback(null, 'token');
    });

    const res = await agent
      .post('/api/v1/auth/register')
      .send({ userName: 'testuser', email: 'test2@example.com', password: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body.token).toBe('token');
  });

  it('should return 500 if there is a server error', async () => {
    User.findOne.mockRejectedValue(new Error('Server error'));

    const res = await agent
      .post('/api/v1/auth/register')
      .send({ userName: 'testuser', email: 'test@example.com', password: 'password123' });

    expect(res.status).toBe(500);
  });
});