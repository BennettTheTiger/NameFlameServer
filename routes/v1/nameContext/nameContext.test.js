const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const router = require('./index');
const NameContext = require('../../../models/nameContext');
const checkNameContextOwner = require('../../../middleware/checkNameContextOwner');
const authMiddleware = require('../../../middleware/auth');

jest.mock('../../../models/nameContext');
jest.mock('../../../middleware/checkNameContextOwner');

process.env.JWT_SECRET = 'your_secret_key';

const app = express();
app.use(express.json());
app.use('/api/v1', authMiddleware, router);

describe('NameContext Routes', () => {
  let token;

  beforeEach(() => {
    token = jwt.sign({ id: 'userId' }, process.env.JWT_SECRET, { expiresIn: '1h' });
  });

  it('GET /nameContext/:id should return name context', async () => {
    const nameContext = { id: 'contextId', name: 'Test Name', owner: 'userId', setCurrentUserId: jest.fn(), toObject: jest.fn().mockReturnValue({ id: 'contextId', name: 'Test Name' }) };
    NameContext.findOne.mockResolvedValue(nameContext);

    checkNameContextOwner.mockImplementation((req, res, next) => next());
    const response = await request(app).get('/api/v1/nameContext/contextId').set('Authorization', `Bearer ${token}`);

    expect(NameContext.findOne).toHaveBeenCalledWith({ id: 'contextId' });
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ id: 'contextId', name: 'Test Name' });
  });

  it('GET /nameContexts should return name contexts', async () => {
    const nameContexts = [{ id: 'contextId', name: 'Test Name', owner: 'userId', toObject: jest.fn().mockReturnValue({ id: 'contextId', name: 'Test Name' }), setCurrentUserId: jest.fn() }];
    NameContext.find.mockImplementation(() => ({
      limit: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(nameContexts),
      forEach: jest.fn(),
      map: jest.fn().mockReturnValue(nameContexts)
    }));

    const response = await request(app).get('/api/v1/nameContexts').set('Authorization', `Bearer ${token}`);

    expect(NameContext.find).toHaveBeenCalledWith({ owner: 'userId' });
    expect(response.status).toBe(200);
    expect(response.body).toEqual([{ id: 'contextId', name: 'Test Name', owner: 'userId' }]);
  });

  it('POST /nameContext should create a new name context', async () => {
    const newNameContext = { id: 'contextId', name: 'Test Name', owner: 'userId', validateSync: jest.fn(), save: jest.fn() };
    NameContext.mockImplementation(() => newNameContext);

    const response = await request(app).post('/api/v1/nameContext').send({ name: 'Test Name', description: 'Test Description' }).set('Authorization', `Bearer ${token}`);

    expect(newNameContext.validateSync).toHaveBeenCalled();
    expect(newNameContext.save).toHaveBeenCalled();
    expect(response.status).toBe(201);
    expect(response.text).toBe('Name context added');
  });

  it('PATCH /nameContext/:id should update name context', async () => {
    const nameContext = { id: 'contextId', name: 'Old Name', owner: 'userId', validateSync: jest.fn(), save: jest.fn(), toObject: jest.fn().mockReturnValue({ id: 'contextId', name: 'Updated Name' }) };
    NameContext.findOne.mockResolvedValue(nameContext);

    const response = await request(app).patch('/api/v1/nameContext/contextId').send({ name: 'Updated Name' }).set('Authorization', `Bearer ${token}`);

    expect(NameContext.findOne).toHaveBeenCalledWith({ id: 'contextId' });
    expect(nameContext.validateSync).toHaveBeenCalled();
    expect(nameContext.save).toHaveBeenCalled();
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ id: 'contextId', name: 'Updated Name' });
  });

  it('PATCH /nameContext/:id/match should add name to likedNames', async () => {
    const nameContext = { id: 'contextId', name: 'Test Name', owner: 'userId', participants: ['userId'], likedNames: new Map(), validateSync: jest.fn(), save: jest.fn(), toObject: jest.fn().mockReturnValue({ id: 'contextId', name: 'Test Name' }) };
    NameContext.findOne.mockResolvedValue(nameContext);

    const response = await request(app).patch('/api/v1/nameContext/contextId/match').send({ name: 'Liked Name' }).set('Authorization', `Bearer ${token}`);

    expect(NameContext.findOne).toHaveBeenCalledWith({ id: 'contextId' });
    expect(nameContext.likedNames.get('userId')).toContain('Liked Name');
    expect(nameContext.validateSync).toHaveBeenCalled();
    expect(nameContext.save).toHaveBeenCalled();
    expect(response.status).toBe(201);
    expect(response.body).toEqual({ id: 'contextId', name: 'Test Name' });
  });

  it('DELETE /nameContext/:id should delete name context', async () => {
    NameContext.deleteOne.mockResolvedValue({ deletedCount: 1 });

    const response = await request(app).delete('/api/v1/nameContext/contextId').set('Authorization', `Bearer ${token}`);

    expect(NameContext.deleteOne).toHaveBeenCalledWith({ id: 'contextId' });
    expect(response.status).toBe(204);
  });
});