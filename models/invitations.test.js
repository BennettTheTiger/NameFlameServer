const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Invitation = require('./invitations');

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

describe('Invitation Model', () => {
  afterEach(async () => {
    // Clear the database after each test
    await Invitation.deleteMany({});
  });

  it('should create an Invitation successfully', async () => {
    const invitationData = {
      email: 'test@example.com',
      nameContextId: 'test-name-context-id',
    };

    const invitation = await Invitation.create(invitationData);

    expect(invitation.email).toBe(invitationData.email);
    expect(invitation.nameContextId).toBe(invitationData.nameContextId);
    expect(invitation.id).toBeDefined(); // Auto-generated ID
    expect(invitation.expiresAt).toBeDefined(); // Auto-generated expiration
    expect(invitation.createdAt).toBeDefined(); // Auto-generated creation time
  });

  it('should fail to create an Invitation without required fields', async () => {
    const invalidData = {
      nameContextId: 'test-name-context-id',
    };

    await expect(Invitation.create(invalidData)).rejects.toThrow(mongoose.Error.ValidationError);
  });

  it.skip('should delete an Invitation after TTL expires', async () => {
    const invitationData = {
      email: 'test@example.com',
      nameContextId: 'test-name-context-id',
    };

    const invitation = await Invitation.create(invitationData);

    // Temporarily reduce the TTL value for testing
    await mongoose.connection.db.collection('invitations').dropIndex('createdAt_1');
    await mongoose.connection.db.collection('invitations').createIndex(
      { createdAt: 1 },
      { expireAfterSeconds: 1 } // Set TTL to 1 second for the test
    );

    // Wait for 2 seconds to ensure TTL index removes the document
    await new Promise((resolve) => setTimeout(resolve, 2100));

    const foundInvitation = await Invitation.findById(invitation._id);
    expect(foundInvitation).toBeNull(); // Document should be deleted

    // Restore the original TTL index
    await mongoose.connection.db.collection('invitations').dropIndex('createdAt_1');
    await mongoose.connection.db.collection('invitations').createIndex(
      { createdAt: 1 },
      { expireAfterSeconds: 86400 } // Restore original TTL value
    );
  });

  it('should generate a unique ID for each Invitation', async () => {
    const invitation1 = await Invitation.create({
      email: 'user1@example.com',
      nameContextId: 'context1',
    });

    const invitation2 = await Invitation.create({
      email: 'user2@example.com',
      nameContextId: 'context2',
    });

    expect(invitation1.id).not.toBe(invitation2.id); // IDs should be unique
  });
});