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
    expect(nameContext.matches).toEqual([]);
  });

  it('should return the intersection (matches) of liked names', () => {
    const nameContext = new NameContext({
      likedNames: {
        'user1': ['Alice', 'Bob'],
        'user2': ['Bob', 'Charlie'],
        'user3': ['Bob', 'David']
      }
    });

    const intersection = nameContext.matches;
    expect(intersection).toEqual(['Bob']);
  });

  it('should include virtual fields in toJSON and toObject', () => {
    const nameContext = new NameContext({
      likedNames: {
        'user1': ['Alice', 'Bob'],
        'user2': ['Bob', 'Charlie'],
        'user3': ['Bob', 'David']
      }
    });

    const json = nameContext.toJSON();
    const obj = nameContext.toObject();

    expect(json.matches).toEqual(['Bob']);
    expect(obj.matches).toEqual(['Bob']);
  });
});