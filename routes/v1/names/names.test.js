const request = require('supertest');
const express = require('express');
const Name = require('../../../models/name');
const router = require('./index');
const { errorHandler } = require('../../../middleware/errors');

const app = express();
app.use(express.json());
app.use('/api/v1', router);
app.use(errorHandler);

jest.mock('../../../models/name');
jest.mock('../../../logger');

describe('Name Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /name/random', () => {
    it('should return 200 and a random name if found', async () => {
      const randomName = [{ name: 'John', popularity: new Map([['2021', { male: 100 }]]) }];
      Name.aggregate.mockResolvedValue(randomName);
      Name.prototype.toObject = jest.fn().mockReturnValue(randomName[0]);

      const res = await request(app)
        .get('/api/v1/name/random')
        .set('Authorization', 'Bearer validToken');

      expect(Name.aggregate).toHaveBeenCalledWith([{ $sample: { size: 1 } }]);
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        name: 'John',
        popularity: { '2021': { male: 100 } }
      });
    });

    it('should return 404 if no names are found', async () => {
      Name.aggregate.mockResolvedValue([]);

      const res = await request(app)
        .get('/api/v1/name/random')
        .set('Authorization', 'Bearer validToken');

      expect(Name.aggregate).toHaveBeenCalledWith([{ $sample: { size: 1 } }]);
      expect(res.status).toBe(404);
      expect(res.body.message).toBe('No names found');
    });
  });

  describe('GET /name/:value', () => {
    it('should return 200 and the name if found', async () => {
      const nameResult = { name: 'John', popularity: new Map([['2021', { male: 100 }]]) };
      Name.findOne.mockResolvedValue(nameResult);
      Name.prototype.toObject = jest.fn().mockReturnValue(nameResult);

      const res = await request(app)
        .get('/api/v1/name/John')
        .set('Authorization', 'Bearer validToken');

      expect(Name.findOne).toHaveBeenCalledWith({ name: { $eq: 'John' } });
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        name: 'John',
        popularity: { '2021': { male: 100 } }
      });
    });

    it('should return 404 if the name is not found', async () => {
      Name.findOne.mockResolvedValue(null);

      const res = await request(app)
        .get('/api/v1/name/John')
        .set('Authorization', 'Bearer validToken');

      expect(Name.findOne).toHaveBeenCalledWith({ name: { $eq: 'John' } });
      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Name John not found');
    });
  });
});