const augmentParticipants = require('./augmentParticipants');
const admin = require('firebase-admin');
const Users = require('../models/user');


jest.mock('firebase-admin', () => ({
  auth: jest.fn(() => ({
    getUser: jest.fn((firebaseUid) => {
        if (firebaseUid === 'firebaseUid1') {
          return Promise.resolve({ displayName: 'Alice', email: 'alice@example.com' });
        }
        if (firebaseUid === 'firebaseUid2') {
          return Promise.resolve({ displayName: 'Bob', email: 'bob@example.com' });
        }
        return Promise.resolve(null);
      })
  })),
}));

jest.mock('../models/user');

describe('augmentParticipants', () => {
  beforeEach(() => {

  })
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should augment participants with Firebase user data', async () => {
    const nameContext = {
      participants: ['user1', 'user2'],
    };

    // Mock database responses
    Users.findOne.mockImplementation((query) => {
      if (query.id === 'user1') {
        return Promise.resolve({ id: 'user1', firebaseUid: 'firebaseUid1', email: 'user1@example.com' });
      }
      if (query.id === 'user2') {
        return Promise.resolve({ id: 'user2', firebaseUid: 'firebaseUid2', email: 'user2@example.com' });
      }
      return Promise.resolve(null);
    });

    const result = await augmentParticipants(nameContext);

    expect(result.participants).toEqual([
      { id: 'user1', name: 'Alice', email: 'alice@example.com' },
      { id: 'user2', name: 'Bob', email: 'bob@example.com' },
    ]);

    // Verify database calls
    expect(Users.findOne).toHaveBeenCalledWith({ id: 'user1' });
    expect(Users.findOne).toHaveBeenCalledWith({ id: 'user2' });

  });

  it('should handle participants with no Firebase user data', async () => {
    const nameContext = {
      participants: ['user1'],
    };

    // Mock database response
    Users.findOne.mockResolvedValue({ id: 'user1', firebaseUid: null });

    const result = await augmentParticipants(nameContext);

    expect(result.participants).toEqual([{ id: 'user1' }]);

    // Verify database call
    expect(Users.findOne).toHaveBeenCalledWith({ id: 'user1' });

    // Verify Firebase call is not made
    expect(admin.auth().getUser).not.toHaveBeenCalled();
  });

  it('should handle an empty participants array', async () => {
    const nameContext = {
      participants: [],
    };

    const result = await augmentParticipants(nameContext);

    expect(result.participants).toEqual([]);

    // Verify no database or Firebase calls are made
    expect(Users.findOne).not.toHaveBeenCalled();
    expect(admin.auth().getUser).not.toHaveBeenCalled();
  });

  it('should handle missing participants field in nameContext', async () => {
    const nameContext = {};

    const result = await augmentParticipants(nameContext);

    expect(result.participants).toEqual([]);

    // Verify no database or Firebase calls are made
    expect(Users.findOne).not.toHaveBeenCalled();
    expect(admin.auth().getUser).not.toHaveBeenCalled();
  });
});