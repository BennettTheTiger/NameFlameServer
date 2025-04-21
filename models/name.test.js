const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Name = require('./name');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
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

  it('should calculate the gender virtual field as "male"', async () => {
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

  it('should calculate the gender virtual field as "female"', async () => {
    const nameData = {
      name: 'Name1',
      origin: 'Something',
      meaning: 'Anything',
      popularity: {
        '2021': { males: 300, females: 500 },
        '2022': { males: 350, females: 450 }
      }
    };
    const name = new Name(nameData);
    await name.save();

    const foundName = await Name.findOne({ name: 'Name1' });
    const gender = foundName.gender;
    expect(gender).toBe('female');
  });

  it('should calculate the gender virtual field as "neutral"', async () => {
    const nameData = {
      name: 'Name2',
      origin: 'Something',
      meaning: 'Anything',
      popularity: {
        '2021': { males: 400, females: 400 },
        '2022': { males: 450, females: 450 }
      }
    };
    const name = new Name(nameData);
    await name.save();

    const foundName = await Name.findOne({ name: 'Name2' });
    const gender = foundName.gender;
    expect(gender).toBe('neutral');
  });

  it('should handle missing popularity data gracefully', async () => {
    const nameData = {
      name: 'Name3',
      origin: 'Something',
      meaning: 'Anything'
    };
    const name = new Name(nameData);
    await name.save();

    const foundName = await Name.findOne({ name: 'Name3' });
    expect(foundName.popularity).toBeUndefined();
  });

  it('should handle empty popularity data gracefully', async () => {
    const nameData = {
      name: 'Name4',
      origin: 'Something',
      meaning: 'Anything',
      popularity: {}
    };
    const name = new Name(nameData);
    await name.save();

    const foundName = await Name.findOne({ name: 'Name4' });
    expect(foundName.popularity.size).toBe(0);
  });

  it('should update a name successfully', async () => {
    const nameData = { name: 'Name5', origin: 'Something', meaning: 'Anything' };
    const name = new Name(nameData);
    await name.save();

    const updatedData = { origin: 'Updated Origin', meaning: 'Updated Meaning' };
    await Name.updateOne({ name: 'Name5' }, updatedData);

    const updatedName = await Name.findOne({ name: 'Name5' });
    expect(updatedName.origin).toBe('Updated Origin');
    expect(updatedName.meaning).toBe('Updated Meaning');
  });

  it('should delete a name successfully', async () => {
    const nameData = { name: 'Name6', origin: 'Something', meaning: 'Anything' };
    const name = new Name(nameData);
    await name.save();

    await Name.deleteOne({ name: 'Name6' });

    const deletedName = await Name.findOne({ name: 'Name' });
    expect(deletedName).toBeNull();
  });
});