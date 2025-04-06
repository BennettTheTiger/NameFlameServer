const matchBatch = require('./matchBatch');
const recommendNamesUsingFPTree = require('./recommendNamesUsingFPTree');
const Name = require('../models/name');
const logger = require('../logger');

jest.mock('./recommendNamesUsingFPTree');
jest.mock('../models/name');
jest.mock('../logger');

describe('matchBatch', () => {
  const mockReq = {
    query: { limit: 10 },
    nameContext: {
      id: 'test-context-id',
      likedNames: {
        user1: ['Alice', 'Bob'],
        user2: ['Charlie', 'Diana'],
      },
      filter: { gender: 'female' },
    },
    systemUser: { id: 'user1' },
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  it.skip('should fetch names and apply filters correctly', async () => {
    // Mock database results
    Name.aggregate.mockResolvedValue([
      { name: 'Eve', gender: 'female' },
      { name: 'Alice', gender: 'female' },
    ]);

    // Mock recommendations
    recommendNamesUsingFPTree.mockResolvedValue([{ name: 'Fiona' }]);

    const result = await matchBatch(mockReq);

    // Verify database query
    expect(Name.aggregate).toHaveBeenCalledWith([
      { $match: { gender: 'female', name: { $nin: ['Alice', 'Bob'] } } },
      { $sample: { size: 10 } },
    ]);

    // Verify recommendations
    expect(recommendNamesUsingFPTree).toHaveBeenCalledWith(mockReq, mockReq.nameContext);

    // Verify result
    expect(result).toEqual(expect.arrayContaining([
      { name: 'Eve' },
      { name: 'Fiona' },
      { name: 'Grace' },
    ]));
  });

  it.skip('should log a message when no additional names are found', async () => {
    // Mock database results
    Name.aggregate.mockResolvedValue([]);

    // Mock recommendations
    recommendNamesUsingFPTree.mockResolvedValue([]);

    const result = await matchBatch(mockReq);

    // Verify logger
    expect(logger.info).toHaveBeenCalledWith(
      'No more names to fetch with filter',
      JSON.stringify(mockReq.nameContext.filter)
    );

    // Verify result
    expect(result).toEqual([]);
  });

  it('should handle errors gracefully', async () => {
    // Mock database error
    Name.aggregate.mockRejectedValue(new Error('Database error'));

    await expect(matchBatch(mockReq)).rejects.toThrow('Database error');

    // Verify logger
    expect(logger.info).not.toHaveBeenCalled();
  });
});