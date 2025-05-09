const request = require('supertest');
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const NameContext = require('../../../models/nameContext');
const router = require('./index');
const { errorHandler } = require('../../../middleware/errors');
const Invitation = require('../../../models/invitations');
const User = require('../../../models/user');

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
jest.mock('../../../models/user');
jest.mock('../../../logger');
jest.mock('../../../models/invitations');
jest.mock('../../../match/matchBatch');
jest.mock('uuid', () => ({ v4: jest.fn() }));

describe('NameContext Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /nameContext/:id', () => {
    it('should return 200 and the name context if found', async () => {
      const nameContext = {
        id: 'contextId',
        owner: 'userSystemId',
        toObject: jest.fn().mockReturnValue({ id: 'contextId', likedNames: {}, participants: [], owner: 'userSystemId' }),
      };
      NameContext.findOne.mockResolvedValue(nameContext);

      const res = await request(app)
        .get('/api/v1/nameContext/contextId')
        .set('Authorization', 'Bearer validToken');

      expect(NameContext.findOne).toHaveBeenCalledWith({ id: 'contextId' });
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ id: 'contextId', likedNames: [], participants: [], matches: [], owner: 'userSystemId' });
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
          toObject: jest.fn().mockReturnValue({ id: 'contextId1', likedNames: [] }),
        },
        {
          id: 'contextId2',
          toObject: jest.fn().mockReturnValue({ id: 'contextId2', likedNames: [] }),
        }
      ];
      NameContext.find.mockResolvedValue(nameContexts);

      const res = await request(app)
        .get('/api/v1/nameContexts')
        .set('Authorization', 'Bearer validToken');

      expect(NameContext.find).toHaveBeenCalledWith({
        $or: [
          { owner: 'userSystemId' },
          { participants: { $in: ['userSystemId'] } }
        ]
      });
      expect(res.status).toBe(200);
      expect(res.body).toEqual([
        { id: 'contextId1', likedNames: [], matches: [] },
        { id: 'contextId2', likedNames: [], matches: [] }
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
        toObject: jest.fn().mockReturnValue({ id: 'contextId', likedNames: {} })
      };
      NameContext.findOne.mockResolvedValue(nameContext);

      const res = await request(app)
        .patch('/api/v1/nameContext/contextId')
        .send({ name: 'new name', description: 'new description', filter: {} })
        .set('Authorization', 'Bearer validToken');

      expect(NameContext.findOne).toHaveBeenCalledWith({ id: 'contextId' });
      expect(nameContext.name).toBe('new name');
      expect(nameContext.description).toBe('new description');
      expect(nameContext.filter).toEqual({});
      expect(nameContext.save).toHaveBeenCalled();
      expect(res.status).toBe(200);
      expect(res.body).toEqual({});
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
        likedNames: { 'userSystemId': [] },
        validateSync: jest.fn().mockReturnValue(null),
        updateOne: jest.fn().mockResolvedValue({}),
        toObject: jest.fn().mockReturnValue({ id: 'contextId', likedNames: { 'userSystemId': ['name'] } })
      };
      NameContext.findOne.mockResolvedValue(nameContext);
      User.findOne.mockResolvedValue({ id: 'userId' });

      const res = await request(app)
        .patch('/api/v1/nameContext/contextId/match')
        .send({ name: 'name' })
        .set('Authorization', 'Bearer validToken');

      expect(NameContext.findOne).toHaveBeenCalledWith({ id: 'contextId' });
      expect(nameContext.updateOne).toHaveBeenCalled();
      expect(res.status).toBe(201);
      expect(res.body).toEqual({});
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
        likedNames: {'userSystemId': ['name1', 'name2']},
        validateSync: jest.fn().mockReturnValue(null),
        updateOne: jest.fn().mockResolvedValue({}),
        toObject: jest.fn().mockReturnValue({ id: 'contextId', likedNames: {'userSystemId': ['name2'] } })
      };
      NameContext.findOne.mockResolvedValue(nameContext);

      const res = await request(app)
        .patch('/api/v1/nameContext/contextId/removeNames')
        .send({ names: ['name1'] })
        .set('Authorization', 'Bearer validToken');

      expect(nameContext.likedNames.userSystemId).toEqual(['name2']);
      expect(nameContext.updateOne).toHaveBeenCalledWith({ likedNames: { userSystemId: ['name2'] } });
      expect(res.status).toBe(201);
      expect(res.body).toEqual({
        id: 'contextId',
        likedNames: ['name2'],
        matches: ['name2'],
        owner: 'userSystemId',
        participants: [{ id: 'userId' }]
      });
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
      Invitation.deleteMany.mockResolvedValue({ deletedCount: 0 });

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

  describe('GET /nameContext/:id/nextNames', () => {
    it('should return 200 and the next set of names', async () => {
      const nameContext = {
        id: 'contextId',
        owner: 'userSystemId',
        filter: { startsWithLetter: 'A', maxCharacters: 10, gender: 'male' },
      };
      NameContext.findOne.mockResolvedValue(nameContext);

      const res = await request(app)
        .get('/api/v1/nameContext/contextId/nextNames')
        .set('Authorization', 'Bearer validToken');

      expect(res.status).toBe(200);
    });

    it('should return 404 if name context is not found', async () => {
      NameContext.findOne.mockResolvedValue(null);

      const res = await request(app)
        .get('/api/v1/nameContext/contextId/nextNames')
        .set('Authorization', 'Bearer validToken');

      expect(NameContext.findOne).toHaveBeenCalledWith({ id: 'contextId' });
      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Name context contextId not found');
    });

    it('should return 500 if there is a server error', async () => {
      NameContext.findOne.mockRejectedValue(new Error('Server error'));

      const res = await request(app)
        .get('/api/v1/nameContext/contextId/nextNames')
        .set('Authorization', 'Bearer validToken');

      expect(NameContext.findOne).toHaveBeenCalledWith({ id: 'contextId' });
      expect(res.status).toBe(500);
      expect(res.body.message).toBe('Server error');
    });
  });

  describe('GET /nameContext/:id/invites', () => {
    it('should return 200 and the trimmed invites', async () => {
      const invites = [
        { id: 'invite1', email: 'test1@example.com', expiresAt: '2025-04-20T12:00:00Z' },
        { id: 'invite2', email: 'test2@example.com', expiresAt: '2025-04-21T12:00:00Z' },
      ];
      const trimmedInvites = invites.map((invite) => ({
        id: invite.id,
        email: invite.email,
        expiresAt: invite.expiresAt,
      }));

      NameContext.findOne.mockResolvedValue({owner: 'userSystemId'});

      Invitation.find.mockResolvedValue(invites);

      const res = await request(app)
        .get('/api/v1/nameContext/contextId/invites')
        .set('Authorization', 'Bearer validToken');

      expect(Invitation.find).toHaveBeenCalledWith({ nameContextId: 'contextId' });
      expect(res.status).toBe(200);
      expect(res.body).toEqual(trimmedInvites);
    });

    it('should return 500 if there is a server error', async () => {
      Invitation.find.mockRejectedValue(new Error('Server error'));

      const res = await request(app)
        .get('/api/v1/nameContext/contextId/invites')
        .set('Authorization', 'Bearer validToken');

      expect(res.status).toBe(500);
    });
  });
  describe('/nameContext/:id/participant', () => {
    it('should return 200 and update the participant in the name context', async () => {
      const nameContext = {
        id: 'contextId',
        participants: [{ id: 'participantId1', email: 'test1@example.com' }],
        owner: 'userSystemId',
        save: jest.fn().mockResolvedValue({}),
        toObject: jest.fn().mockReturnValue({
          id: 'contextId',
          participants: [{ id: 'participantId1', email: 'updated@example.com' }, { email: 'updated@example.com'}],
          owner: 'userSystemId',
        }),
      };

      NameContext.findOne.mockResolvedValue(nameContext);

      const res = await request(app)
        .post('/api/v1/nameContext/contextId/participant')
        .send({ email: 'test@example.com' })
        .set('Authorization', 'Bearer validToken');

      expect(nameContext.save).toHaveBeenCalled();
      expect(res.status).toBe(201);
      expect(res.body).toEqual({ message: 'User added', type: 'user' });
    });

    it('should return 404 if the name context is not found', async () => {
      NameContext.findOne.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/v1/nameContext/contextId/participant')
        .send({ email: 'updated@example.com' })
        .set('Authorization', 'Bearer validToken');

      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Name context contextId not found');
    });

    it('should return 403 if the user is not authorized to update the participant', async () => {
      const nameContext = {
        id: 'contextId',
        participants: [{ id: 'participantId1', email: 'test1@example.com' }],
        owner: 'otherUserId', // Different owner
      };

      NameContext.findOne.mockResolvedValue(nameContext);

      const res = await request(app)
        .delete('/api/v1/nameContext/contextId/participant/participantId1')
        .send({ email: 'updated@example.com' })
        .set('Authorization', 'Bearer validToken');

      expect(res.status).toBe(403);
      expect(res.body.message).toBe('User is not the owner of name context contextId');
    });

    it('should return 500 if there is a server error', async () => {
      NameContext.findOne.mockRejectedValue(new Error('Server error'));

      const res = await request(app)
        .delete('/api/v1/nameContext/contextId/participant/participantId1')
        .set('Authorization', 'Bearer validToken');

      expect(res.status).toBe(500);
    });

    it('should return 204 on successful deletion of a participant', async () => {
      const nameContext = {
        id: 'contextId',
        participants: [{ id: 'participantId1', email: 'test1@example.com' }],
        owner: 'userSystemId',
        save: jest.fn().mockResolvedValue({}),
      };
      NameContext.findOne.mockResolvedValue(nameContext);

      const res = await request(app)
        .delete('/api/v1/nameContext/contextId/participant/participantId1')
        .set('Authorization', 'Bearer validToken');

      expect(res.status).toBe(204);
    });

    it('should return 500 on failed deletion of a participant', async () => {
      const nameContext = {
        id: 'contextId',
        participants: [{ id: 'participantId1', email: 'test1@example.com' }],
        owner: 'userSystemId',
        save: jest.fn().mockRejectedValue(new Error('Failed to delete participant')),
      };
      NameContext.findOne.mockResolvedValue(nameContext);

      const res = await request(app)
        .delete('/api/v1/nameContext/contextId/participant/participantId1')
        .set('Authorization', 'Bearer validToken');

      expect(res.status).toBe(500);
    });
  });
});