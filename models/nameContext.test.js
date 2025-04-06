const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const NameContext = require('./nameContext');

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

describe('NameContext Model', () => {
  afterEach(async () => {
    // Clear the database after each test
    await NameContext.deleteMany({});
  });

  it('should create a NameContext successfully', async () => {
    const nameContextData = {
      name: 'Test Context',
      id: 'test-id',
      description: 'A test name context',
      noun: 'test-noun',
      owner: 'owner-id',
      participants: ['participant1', 'participant2'],
      likedNames: { participant1: ['name1'], participant2: ['name2'] },
    };

    const nameContext = await NameContext.create(nameContextData);

    expect(nameContext.name).toBe(nameContextData.name);
    expect(nameContext.id).toBe(nameContextData.id);
    expect(nameContext.description).toBe(nameContextData.description);
    expect(nameContext.noun).toBe(nameContextData.noun);
    expect(nameContext.owner).toBe(nameContextData.owner);
    expect(nameContext.participants).toEqual(expect.arrayContaining(nameContextData.participants));
    expect(nameContext.likedNames).toEqual(nameContextData.likedNames);
  });

  it('should fail to create a NameContext without required fields', async () => {
    const invalidData = {
      id: 'test-id',
    };

    await expect(NameContext.create(invalidData)).rejects.toThrow(mongoose.Error.ValidationError);
  });

  it('should update a NameContext successfully', async () => {
    const nameContext = await NameContext.create({
      name: 'Initial Name',
      id: 'test-id',
      owner: 'owner-id',
    });

    nameContext.name = 'Updated Name';
    await nameContext.save();

    const updatedNameContext = await NameContext.findOne({ id: 'test-id' });
    expect(updatedNameContext.name).toBe('Updated Name');
  });

  it('should delete a NameContext successfully', async () => {
    await NameContext.create({
      name: 'To Be Deleted',
      id: 'delete-id',
      owner: 'owner-id',
    });

    await NameContext.deleteOne({ id: 'delete-id' });

    const deletedNameContext = await NameContext.findOne({ id: 'delete-id' });
    expect(deletedNameContext).toBeNull();
  });
});