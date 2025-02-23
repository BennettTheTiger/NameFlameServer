const request = require('supertest');
const express = require('express');
const router = require('./index');
const Name = require('../../../models/name');

jest.mock('../../../models/name');

const app = express();
app.use(express.json());
app.use('/api/v1', router);

describe('Names Routes', () => {
  it('GET /names should return a list of names', async () => {
    const names = [{ name: 'Bennett' }, { name: 'Nicole' }];
    Name.find.mockResolvedValue(names);

    const response = await request(app).get('/api/v1/names');

    expect(Name.find).toHaveBeenCalledWith();
    expect(response.status).toBe(200);
    expect(response.body).toEqual(names);
  });

  // TODO something is causing this to fail with jest and the .toObject with virtuals is not working
  it.skip('GET /name/random should return a random name', async () => {
    const randomName = {
      name: 'Bennett',
      popularity: {
        1996: { males: 123, females: 2 }
      }
    };
    Name.aggregate.mockResolvedValue([randomName]);

    const response = await request(app).get('/api/v1/name/random');

    expect(Name.aggregate).toHaveBeenCalledWith([{ $sample: { size: 1 } }]);
    expect(response.status).toBe(200);
    const processedRandomName = {
      name: 'Bennett',
      popularity: { 2020: { male: 123, females: 2 } },
      gender: 'male'
    };
    expect(response.body).toEqual(processedRandomName);
  });
});