const request = require('supertest');
const express = require('express');
const { v4: uuidv4 } = require('uuid');
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

jest.mock('../../../models/nameContext');
jest.mock('../../../models/name');
jest.mock('../../../logger');
jest.mock('uuid', () => ({ v4: jest.fn() }));

describe('NameContext Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /nameContext/:id', () => {
    it('should return 200 and the name context if found', async () => {
      const nameContext = {
        id: 'contextId',
        toObject: jest.fn().mockReturnValue({ id: 'contextId', likedNames: new Map() }),
        setCurrentUserId: jest.fn()
      };
      NameContext.findOne.mockResolvedValue(nameContext);

      const res = await request(app)
        .get('/api/v1/nameContext/contextId')
        .set('Authorization', 'Bearer validToken');

      expect(NameContext.findOne).toHaveBeenCalledWith({ id: 'contextId' });
      expect(nameContext.setCurrentUserId).toHaveBeenCalledWith('userSystemId');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ id: 'contextId', likedNames: [] });
    });

    it('should return 404 if name context is not found', async () => {
      NameContext.findOne.mockResolvedValue(null);

      const res = await request(app)
        .get('/api/v1/nameContext/contextId')
        .set('Authorization', 'Bearer validToken');

      expect(NameContext.findOne).toHaveBeenCalledWith({ id: 'contextId' });
      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Name context contextId not found');
    });
  });

  describe('GET /nameContexts', () => {
    it('should return 200 and the list of name contexts', async () => {
      const nameContexts = [
        {
          id: 'contextId1',
          toObject: jest.fn().mockReturnValue({ id: 'contextId1', likedNames: new Map() }),
          setCurrentUserId: jest.fn()
        },
        {
          id: 'contextId2',
          toObject: jest.fn().mockReturnValue({ id: 'contextId2', likedNames: new Map() }),
          setCurrentUserId: jest.fn()
        }
      ];
      NameContext.find.mockResolvedValue(nameContexts);

      const res = await request(app)
        .get('/api/v1/nameContexts')
        .set('Authorization', 'Bearer validToken');

      expect(NameContext.find).toHaveBeenCalledWith({ owner: 'userSystemId' });
      expect(nameContexts[0].setCurrentUserId).toHaveBeenCalledWith('userSystemId');
      expect(nameContexts[1].setCurrentUserId).toHaveBeenCalledWith('userSystemId');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([
        { id: 'contextId1', likedNames: [] },
        { id: 'contextId2', likedNames: [] }
      ]);
    });
  });

  describe('POST /nameContext', () => {
    it('should return 201 and add the name context', async () => {
      uuidv4.mockReturnValue('unique-id');
      const newNameContext = {
        validateSync: jest.fn().mockReturnValue(null),
        save: jest.fn().mockResolvedValue({})
      };
      NameContext.mockImplementation(() => newNameContext);

      const res = await request(app)
        .post('/api/v1/nameContext')
        .send({ name: 'test', description: 'test description', filter: {}, noun: 'test noun' })
        .set('Authorization', 'Bearer validToken');

      expect(NameContext).toHaveBeenCalledWith({
        name: 'test',
        description: 'test description',
        noun: 'test noun',
        owner: 'userSystemId',
        id: 'unique-id',
        participants: [],
        filter: {}
      });
      expect(newNameContext.save).toHaveBeenCalled();
      expect(res.status).toBe(201);
      expect(res.text).toBe('Name context added');
    });

    it('should return 400 if validation fails', async () => {
      uuidv4.mockReturnValue('unique-id');
      const validationError = new Error('Validation error');
      const newNameContext = {
        validateSync: jest.fn().mockReturnValue(validationError)
      };
      NameContext.mockImplementation(() => newNameContext);

      const res = await request(app)
        .post('/api/v1/nameContext')
        .send({ name: 'test', description: 'test description', filter: {}, noun: 'test noun' })
        .set('Authorization', 'Bearer validToken');

      expect(NameContext).toHaveBeenCalledWith({
        name: 'test',
        description: 'test description',
        noun: 'test noun',
        owner: 'userSystemId',
        id: 'unique-id',
        participants: [],
        filter: {}
      });
      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Validation error');
    });
  });

  describe('PATCH /nameContext/:id', () => {
    it('should return 200 and update the name context', async () => {
      const nameContext = {
        id: 'contextId',
        name: 'old name',
        owner: 'userSystemId',
        description: 'old description',
        filter: {},
        participants: [],
        validateSync: jest.fn().mockReturnValue(null),
        save: jest.fn().mockResolvedValue({}),
        toObject: jest.fn().mockReturnValue({ id: 'contextId', likedNames: new Map() })
      };
      NameContext.findOne.mockResolvedValue(nameContext);

      const res = await request(app)
        .patch('/api/v1/nameContext/contextId')
        .send({ name: 'new name', description: 'new description', filter: {}, participants: ['userId'] })
        .set('Authorization', 'Bearer validToken');

      expect(NameContext.findOne).toHaveBeenCalledWith({ id: 'contextId' });
      expect(nameContext.name).toBe('new name');
      expect(nameContext.description).toBe('new description');
      expect(nameContext.filter).toEqual({});
      expect(nameContext.participants).toEqual(['userId']);
      expect(nameContext.save).toHaveBeenCalled();
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ id: 'contextId', likedNames: [] });
    });

    it('should return 400 if validation fails', async () => {
      const nameContext = {
        id: 'contextId',
        owner: 'userSystemId',
        validateSync: jest.fn().mockReturnValue(new Error('Validation error'))
      };
      NameContext.findOne.mockResolvedValue(nameContext);

      const res = await request(app)
        .patch('/api/v1/nameContext/contextId')
        .send({ name: 'new name', description: 'new description', filter: 'new filter', participants: ['userId'] })
        .set('Authorization', 'Bearer validToken');

      expect(NameContext.findOne).toHaveBeenCalledWith({ id: 'contextId' });
      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Validation error');
    });
  });

  describe('PATCH /nameContext/:id/match', () => {
    it('should return 201 and add a match to the name context', async () => {
      const nameContext = {
        id: 'contextId',
        participants: ['userId'],
        owner: 'userSystemId',
        likedNames: new Map(),
        validateSync: jest.fn().mockReturnValue(null),
        save: jest.fn().mockResolvedValue({}),
        toObject: jest.fn().mockReturnValue({ id: 'contextId', likedNames: new Map([['userSystemId', ['name']]]) })
      };
      NameContext.findOne.mockResolvedValue(nameContext);

      const res = await request(app)
        .patch('/api/v1/nameContext/contextId/match')
        .send({ name: 'name' })
        .set('Authorization', 'Bearer validToken');

      expect(NameContext.findOne).toHaveBeenCalledWith({ id: 'contextId' });
      expect(nameContext.save).toHaveBeenCalled();
      expect(res.status).toBe(201);
      expect(res.body).toEqual({ id: 'contextId', likedNames: ['name'] });
    });

    it('should return 400 if name is not provided', async () => {
      NameContext.findOne.mockResolvedValue({ owner: 'userSystemId' });
      const res = await request(app)
        .patch('/api/v1/nameContext/contextId/match')
        .send({})
        .set('Authorization', 'Bearer validToken');

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Name is required');
    });

    it('should return 404 if name context is not found', async () => {
      NameContext.findOne.mockResolvedValue(null);

      const res = await request(app)
        .patch('/api/v1/nameContext/contextId/match')
        .send({ name: 'name' })
        .set('Authorization', 'Bearer validToken');

      expect(NameContext.findOne).toHaveBeenCalledWith({ id: 'contextId' });
      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Name context contextId not found');
    });

    it('should return 403 if user is not a participant or owner', async () => {
      const nameContext = {
        id: 'contextId',
        participants: [],
        owner: 'otherUserId'
      };
      NameContext.findOne.mockResolvedValue(nameContext);

      const res = await request(app)
        .patch('/api/v1/nameContext/contextId/match')
        .send({ name: 'name' })
        .set('Authorization', 'Bearer validToken');

      expect(NameContext.findOne).toHaveBeenCalledWith({ id: 'contextId' });
      expect(res.status).toBe(403);
      expect(res.body.message).toBe('User is not authorized for this name context');
    });
  });

  describe('PATCH /nameContext/:id/removeNames', () => {
    it('should return 200 and remove names from the name context', async () => {
      const nameContext = {
        id: 'contextId',
        participants: ['userId'],
        owner: 'userSystemId',
        likedNames: new Map([['userSystemId', ['name1', 'name2']]]),
        validateSync: jest.fn().mockReturnValue(null),
        save: jest.fn().mockResolvedValue({}),
        toObject: jest.fn().mockReturnValue({ id: 'contextId', likedNames: new Map([['userSystemId', ['name2']]]) })
      };
      NameContext.findOne.mockResolvedValue(nameContext);

      const res = await request(app)
        .patch('/api/v1/nameContext/contextId/removeNames')
        .send({ names: ['name1'] })
        .set('Authorization', 'Bearer validToken');

      expect(NameContext.findOne).toHaveBeenCalledWith({ id: 'contextId' });
      expect(nameContext.likedNames.get('userSystemId')).toEqual(['name2']);
      expect(nameContext.save).toHaveBeenCalled();
      expect(res.status).toBe(201);
      expect(res.body).toEqual({ id: 'contextId', likedNames: ['name2'] });
    });

    it('should return 404 if name context is not found', async () => {
      NameContext.findOne.mockResolvedValue(null);

      const res = await request(app)
        .patch('/api/v1/nameContext/contextId/removeNames')
        .send({ names: ['name1'] })
        .set('Authorization', 'Bearer validToken');

      expect(NameContext.findOne).toHaveBeenCalledWith({ id: 'contextId' });
      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Name context contextId not found');
    });

    it('should return 403 if user is not a participant or owner', async () => {
      const nameContext = {
        id: 'contextId',
        participants: [],
        owner: 'otherUserId'
      };
      NameContext.findOne.mockResolvedValue(nameContext);

      const res = await request(app)
        .patch('/api/v1/nameContext/contextId/removeNames')
        .send({ names: ['name1'] })
        .set('Authorization', 'Bearer validToken');

      expect(NameContext.findOne).toHaveBeenCalledWith({ id: 'contextId' });
      expect(res.status).toBe(403);
      expect(res.body.message).toBe('User is not authorized for this name context');
    });
  });

  describe('DELETE /nameContext/:id', () => {
    it('should return 204 and delete the name context', async () => {
      NameContext.findOne.mockResolvedValue({owner: 'userSystemId'});
      NameContext.deleteOne.mockResolvedValue({ deletedCount: 1 });

      const res = await request(app)
        .delete('/api/v1/nameContext/contextId')
        .set('Authorization', 'Bearer validToken');

      expect(NameContext.deleteOne).toHaveBeenCalledWith({ id: 'contextId' });
      expect(res.status).toBe(204);
    });

    it('should return 500 if there is a server error', async () => {
      NameContext.deleteOne.mockRejectedValue(new Error('Server error'));

      const res = await request(app)
        .delete('/api/v1/nameContext/contextId')
        .set('Authorization', 'Bearer validToken');

      expect(NameContext.deleteOne).toHaveBeenCalledWith({ id: 'contextId' });
      expect(res.status).toBe(500);
      expect(res.body.message).toBe('Server error');
    });
  });
});