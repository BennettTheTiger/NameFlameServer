const augmentNameContext = require('./augmentNameContext');
const calculateMatches = require('./calculateMatches');

jest.mock('./calculateMatches');

describe('augmentNameContext', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should augment the nameContext with matches and liked names', () => {
    const req = {
      systemUser: { id: 'user1' },
    };
    const nameContext = {
      id: 'context1',
      name: 'Test Context',
      description: 'A test name context',
      noun: 'names',
      owner: 'user1',
      participants: ['user1', 'user2'],
      likedNames: {
        user1: ['Alice', 'Bob'],
        user2: ['Bob', 'Charlie'],
      },
      filter: { gender: 'female' },
      updatedAt: '2025-04-20T12:00:00Z',
      createdAt: '2025-04-19T12:00:00Z',
    };

    // Mock calculateMatches to return matches
    calculateMatches.mockReturnValue(['Bob']);

    const result = augmentNameContext(req, nameContext);

    expect(result).toEqual({
      id: 'context1',
      name: 'Test Context',
      description: 'A test name context',
      noun: 'names',
      owner: 'user1',
      participants: ['user1', 'user2'],
      likedNames: ['Alice', 'Bob'],
      filter: { gender: 'female' },
      matches: ['Bob'],
      updatedAt: '2025-04-20T12:00:00Z',
      createdAt: '2025-04-19T12:00:00Z',
    });

    // Verify calculateMatches was called with the correct argument
    expect(calculateMatches).toHaveBeenCalledWith(nameContext);
  });

  it('should handle missing likedNames for the user', () => {
    const req = {
      systemUser: { id: 'user3' },
    };
    const nameContext = {
      id: 'context1',
      name: 'Test Context',
      likedNames: {
        user1: ['Alice', 'Bob'],
        user2: ['Bob', 'Charlie'],
      },
    };

    // Mock calculateMatches to return matches
    calculateMatches.mockReturnValue(['Bob']);

    const result = augmentNameContext(req, nameContext);

    expect(result.likedNames).toEqual([]);
    expect(result.matches).toEqual(['Bob']);
  });

  it('should handle an empty nameContext', () => {
    const req = {
      systemUser: { id: 'user1' },
    };
    const nameContext = {};

    // Mock calculateMatches to return an empty array
    calculateMatches.mockReturnValue([]);

    const result = augmentNameContext(req, nameContext);

    expect(result).toEqual({
      id: undefined,
      name: undefined,
      description: undefined,
      noun: undefined,
      owner: undefined,
      participants: undefined,
      likedNames: [],
      filter: undefined,
      matches: [],
      updatedAt: undefined,
      createdAt: undefined,
    });

    // Verify calculateMatches was called with the correct argument
    expect(calculateMatches).toHaveBeenCalledWith(nameContext);
  });
});