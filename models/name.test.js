const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Name = require('./name');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Name Model', () => {
  it('should create a name with required fields', async () => {
    const nameData = { name: 'Bennett', about: 'Best dev ever' };
    const name = new Name(nameData);
    await name.save();

    const foundName = await Name.findOne({ name: 'Bennett' });
    expect(foundName).toMatchObject(nameData);
  });

  it('should not create a name without the required field', async () => {
    const nameData = { origin: 'Hebrew', meaning: 'God is gracious' };
    const name = new Name(nameData);

    let error;
    try {
      await name.save();
    } catch (e) {
      error = e;
    }

    expect(error).toBeInstanceOf(mongoose.Error.ValidationError);
    expect(error.errors.name).toBeDefined();
  });

  it('should create a name with popularity data', async () => {
    const nameData = {
      name: 'John',
      origin: 'Hebrew',
      meaning: 'God is gracious',
      popularity: {
        '2021': { males: 500, females: 300 },
        '2022': { males: 450, females: 350 }
      }
    };
    const name = new Name(nameData);
    await name.save();

    const foundName = await Name.findOne({ name: 'John' });
    expect(foundName.popularity.get('2021').males).toBe(500);
    expect(foundName.popularity.get('2021').females).toBe(300);
    expect(foundName.popularity.get('2022').males).toBe(450);
    expect(foundName.popularity.get('2022').females).toBe(350);
  });

  it('should calculate the gender virtual field', async () => {
    const nameData = {
      name: 'Name',
      origin: 'Something',
      meaning: 'Anything',
      popularity: {
        '2021': { males: 500, females: 300 },
        '2022': { males: 450, females: 350 }
      }
    };
    const name = new Name(nameData);
    await name.save();

    const foundName = await Name.findOne({ name: 'Name' });
    const gender = foundName.gender;
    expect(gender).toBe('male');
  });
});