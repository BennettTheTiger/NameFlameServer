const request = require('supertest');
const express = require('express');
const admin = require('../../../firebase');
const User = require('../../../models/user');
const NameContext = require('../../../models/nameContext');
const router = require('./index');
const { errorHandler } = require('../../../middleware/errors');

const app = express();
app.use(express.json());

// Middleware to mock authentication and user data
app.use((req, res, next) => {
  req.userData = { uid: 'firebaseUid' };
  req.systemUser = { id: 'userSystemId' };
  next();
});

app.use('/api/v1', router);
app.use(errorHandler);

jest.mock('../../../models/user');
jest.mock('../../../models/nameContext');
jest.mock('../../../firebase', () => ({
  auth: jest.fn().mockReturnThis(),
  deleteUser: jest.fn(),
  verifyIdToken: jest.fn()
}));
jest.mock('../../../logger');

describe('DELETE /api/v1/user', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    admin.auth().verifyIdToken.mockResolvedValue({ uid: 'firebaseUid' });
    User.findOne.mockResolvedValue({ id: 'userSystemId' });
  });

  it('should return 204 if user is successfully deleted', async () => {
    admin.auth().deleteUser.mockResolvedValue();
    User.deleteOne.mockResolvedValue({ deletedCount: 1 });
    NameContext.deleteMany.mockResolvedValue({ deletedCount: 2 });

    const res = await request(app)
      .delete('/api/v1/user')
      .set('Authorization', 'Bearer validToken')
      .send();

    expect(admin.auth().deleteUser).toHaveBeenCalledWith('firebaseUid');
    expect(User.deleteOne).toHaveBeenCalledWith({ id: 'userSystemId' });
    expect(NameContext.deleteMany).toHaveBeenCalledWith({ owner: 'userSystemId' });
    expect(res.status).toBe(204);
  });

  it('should return 404 if user is not found in MongoDB', async () => {
    admin.auth().deleteUser.mockResolvedValue();
    User.deleteOne.mockResolvedValue({ deletedCount: 0 });

    const res = await request(app)
      .delete('/api/v1/user')
      .set('Authorization', 'Bearer validToken')
      .send();

    expect(admin.auth().deleteUser).toHaveBeenCalledWith('firebaseUid');
    expect(User.deleteOne).toHaveBeenCalledWith({ id: 'userSystemId' });
    expect(res.status).toBe(404);
    expect(res.body.message).toBe('User with UID userSystemId not found the system.');
  });

  it('should return 500 if there is a server error', async () => {
    admin.auth().deleteUser.mockRejectedValue(new Error('Server error'));

    const res = await request(app)
      .delete('/api/v1/user')
      .set('Authorization', 'Bearer validToken')
      .send();

    expect(admin.auth().deleteUser).toHaveBeenCalledWith('firebaseUid');
    expect(res.status).toBe(500);
    expect(res.body.message).toBe('Server error');
  });
});