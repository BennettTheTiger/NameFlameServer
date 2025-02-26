const request = require('supertest');
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../../../models/user');
const router = require('./login');
const { errorHandler } = require('../../../middleware/errors');

const app = express();
app.use(express.json());
app.use('/api/v1/auth', router);
app.use(errorHandler);

jest.mock('../../../models/user');
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');

describe('POST /api/v1/auth/login', () => {
    it('should return 400 if user does not exist', async () => {
        User.findOne.mockResolvedValue(null);

        const res = await request(app)
            .post('/api/v1/auth/login')
            .send({ email: 'test@example.com', password: 'password123' });

        expect(res.status).toBe(400);
        expect(res.body.error).toBe('Invalid credentials');
    });

    it('should return 400 if password does not match', async () => {
        User.findOne.mockResolvedValue({ email: 'test@example.com', password: 'hashedpassword' });
        bcrypt.compare.mockResolvedValue(false);

        const res = await request(app)
            .post('/api/v1/auth/login')
            .send({ email: 'test@example.com', password: 'password123' });

        expect(res.status).toBe(400);
        expect(res.body.error).toBe('Invalid credentials');
    });

    it('should return 200 and a token if login is successful', async () => {
        const user = { id: '1', userName: 'testuser', role: 'user', email: 'test@example.com', password: 'hashedpassword' };
        User.findOne.mockResolvedValue(user);
        bcrypt.compare.mockResolvedValue(true);
        jwt.sign.mockImplementation((payload, secret, options, callback) => {
            callback(null, 'token');
        });

        const res = await request(app)
            .post('/api/v1/auth/login')
            .send({ email: 'test@example.com', password: 'password123' });

        expect(res.status).toBe(200);
        expect(res.body.token).toBe('token');
    });

    it('should return 500 if there is a server error', async () => {
        User.findOne.mockRejectedValue(new Error('Server Error'));

        const res = await request(app)
            .post('/api/v1/auth/login')
            .send({ email: 'test@example.com', password: 'password123' });

        expect(res.status).toBe(500);
        expect(res.body.error).toBe('Server Error');
    });
});