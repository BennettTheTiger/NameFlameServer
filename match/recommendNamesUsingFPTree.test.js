const recommendNamesUsingFPTree = require('./recommendNamesUsingFPTree');
const NameContext = require('../models/nameContext');
const Name = require('../models/name');
const processNameResult = require('../routes/v1/names/utils');

jest.mock('../models/nameContext');
jest.mock('../models/name');
jest.mock('../routes/v1/names/utils');

describe('recommendNamesUsingFPTree', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should recommend names based on frequent patterns', async () => {
    const req = {
      systemUser: { id: 'user1' },
    };
    const context = {
      id: 'context1',
      likedNames: {
        user1: ['Alice', 'Bob'],
        user2: ['Charlie', 'Diana'],
        user3: ['Alice', 'Charlie'],
      },
    };

    // Mock other name contexts
    NameContext.aggregate.mockResolvedValue([
      {
        id: 'context2',
        likedNames: {
          user4: ['Eve', 'Frank'],
          user5: ['Alice', 'Eve'],
        },
      },
    ]);

    // Mock database results for names
    Name.find.mockResolvedValue([
      { name: 'Eve', gender: 'female' },
      { name: 'Frank', gender: 'male' },
    ]);

    // Mock processNameResult
    processNameResult.mockImplementation((name) => ({
      ...name,
      processed: true,
    }));

    const result = await recommendNamesUsingFPTree(req, context);

    expect(NameContext.aggregate).toHaveBeenCalledWith([
      { $match: { id: { $ne: 'context1' } } },
      { $sample: { size: 20 } },
    ]);

    expect(result).toEqual([
      { name: 'Eve', gender: 'female', processed: true },
      { name: 'Frank', gender: 'male', processed: true },
    ]);
  });

  it('should exclude names already liked by the user', async () => {
    const req = {
      systemUser: { id: 'user1' },
    };
    const context = {
      id: 'context1',
      likedNames: {
        user1: ['Alice', 'Bob'],
        user2: ['Charlie', 'Diana'],
      },
    };

    // Mock other name contexts
    NameContext.aggregate.mockResolvedValue([
      {
        id: 'context2',
        likedNames: {
          user3: ['Alice', 'Eve'],
        },
      },
    ]);

    // Mock database results for names
    Name.find.mockResolvedValue([{ name: 'Eve', gender: 'female' }]);

    // Mock processNameResult
    processNameResult.mockImplementation((name) => ({
      ...name,
      processed: true,
    }));

    const result = await recommendNamesUsingFPTree(req, context);

    expect(result).toEqual([
      { name: 'Eve', gender: 'female', processed: true },
    ]);
  });

  it('should return an empty array if no recommendations are found', async () => {
    const req = {
      systemUser: { id: 'user1' },
    };
    const context = {
      id: 'context1',
      likedNames: {
        user1: ['Alice', 'Bob'],
      },
    };

    // Mock other name contexts
    NameContext.aggregate.mockResolvedValue([]);

    // Mock database results for names
    Name.find.mockResolvedValue([]);

    const result = await recommendNamesUsingFPTree(req, context);

    expect(result).toEqual([]);
  });

  it('should handle errors gracefully', async () => {
    const req = {
      systemUser: { id: 'user1' },
    };
    const context = {
      id: 'context1',
      likedNames: {
        user1: ['Alice', 'Bob'],
      },
    };

    // Mock an error in NameContext.aggregate
    NameContext.aggregate.mockRejectedValue(new Error('Database error'));

    await expect(recommendNamesUsingFPTree(req, context)).rejects.toThrow(
      'Database error'
    );
  });
});