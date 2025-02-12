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
  it('should return an empty set if likedNames is not initialized', () => {
    const nameContext = new NameContext();
    expect(nameContext.matches).toEqual(new Set());
  });

  it('should return the intersection (matches) of liked names', () => {
    const nameContext = new NameContext({
      likedNames: new Map([
        ['user1', ['Alice', 'Bob']],
        ['user2', ['Bob', 'Charlie']],
        ['user3', ['Bob', 'David']]
      ])
    });

    const intersection = nameContext.matches;
    expect(intersection).toEqual(new Set(['Bob']));
  });

  it('should set and get the current user ID', () => {
    const nameContext = new NameContext();
    nameContext.setCurrentUserId('userId');
    expect(nameContext._currentUserId).toBe('userId');
  });

  it('should include virtual fields in toJSON and toObject', () => {
    const nameContext = new NameContext({
      likedNames: new Map([
        ['user1', ['Alice', 'Bob']],
        ['user2', ['Bob', 'Charlie']],
        ['user3', ['Bob', 'David']]
      ])
    });

    const json = nameContext.toJSON();
    const obj = nameContext.toObject();

    expect(json.matches).toEqual(new Set(['Bob']));
    expect(obj.matches).toEqual(new Set(['Bob']));
  });
});