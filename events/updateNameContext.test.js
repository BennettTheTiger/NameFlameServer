const sendUpdateNameContextEvent = require('./updateNameContext');
const calculateMatches = require('../utils/calculateMatches');

jest.mock('../server', () => ({
  io: {
    to: jest.fn().mockReturnThis(),
    emit: jest.fn(),
  },
}));

jest.mock('../utils/calculateMatches', () => jest.fn());

describe('sendUpdateNameContextEvent', () => {
  const { io } = require('../server');

  afterEach(() => {
    jest.clearAllMocks(); // Clear mocks after each test
  });

  it('should emit a nameContextUpdated event to the correct room', async () => {
    const req = {}; // Mock request object (not used in this function)
    const nameContext = {
      id: 'test-name-context-id',
      name: 'Test Name Context',
      description: 'Test Description',
      noun: 'Test Noun',
      participants: ['user1', 'user2'],
      filter: { startsWithLetter: 'A' },
      updatedAt: new Date(),
    };

    const matches = ['match1', 'match2'];
    calculateMatches.mockReturnValue(matches);

    await sendUpdateNameContextEvent(req, nameContext);

    // Verify that the correct room was targeted
    expect(io.to).toHaveBeenCalledWith(`nameContext:${nameContext.id}`);

    // Verify that the event was emitted with the correct data
    expect(io.emit).toHaveBeenCalledWith('nameContextUpdated', {
      id: nameContext.id,
      name: nameContext.name,
      description: nameContext.description,
      noun: nameContext.noun,
      participants: nameContext.participants,
      filter: nameContext.filter,
      matches: matches,
      updatedAt: nameContext.updatedAt,
    });

    // Verify that calculateMatches was called with the correct argument
    expect(calculateMatches).toHaveBeenCalledWith(nameContext);
  });
});