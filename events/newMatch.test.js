const sendNewMatchEvent = require('./newMatch');

jest.mock('../server', () => ({
  io: {
    to: jest.fn().mockReturnThis(),
    emit: jest.fn(),
  },
}));

describe('sendNewMatchEvent', () => {
  const { io } = require('../server');

  afterEach(() => {
    jest.clearAllMocks(); // Clear mocks after each test
  });

  it('should emit a newMatch event to the correct room', () => {
    const nameContext = { id: 'test-name-context-id', name: 'Test Name Context' };
    const match = 'test-match';
    const req = {};

    sendNewMatchEvent(req, nameContext , match);

    // Verify that the correct room was targeted
    expect(io.to).toHaveBeenCalledWith(`nameContext:${nameContext.id}`);

    // Verify that the event was emitted with the correct data
    expect(io.emit).toHaveBeenCalledWith('newMatch', {
      id: nameContext.id,
      name: nameContext.name,
      newMatch: match,
    });
  });
});