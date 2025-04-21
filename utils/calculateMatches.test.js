const calculateMatches = require('./calculateMatches');

describe('calculateMatches', () => {
  it('should return an empty array if likedNames is not initialized', () => {
    const nameContext = {};
    const result = calculateMatches(nameContext);
    expect(result).toEqual([]);
  });

  it('should return an empty array if likedNames is empty', () => {
    const nameContext = { likedNames: {} };
    const result = calculateMatches(nameContext);
    expect(result).toEqual([]);
  });

  it('should return the intersection of liked names', () => {
    const nameContext = {
      likedNames: {
        user1: ['Alice', 'Bob', 'Charlie'],
        user2: ['Bob', 'Charlie', 'Diana'],
        user3: ['Charlie', 'Bob', 'Eve'],
      },
    };
    const result = calculateMatches(nameContext);
    expect(result).toEqual(['Bob', 'Charlie']);
  });

  it('should return an empty array if there is no intersection', () => {
    const nameContext = {
      likedNames: {
        user1: ['Alice', 'Bob'],
        user2: ['Charlie', 'Diana'],
        user3: ['Eve', 'Frank'],
      },
    };
    const result = calculateMatches(nameContext);
    expect(result).toEqual([]);
  });

  it('should handle a single participant', () => {
    const nameContext = {
      likedNames: {
        user1: ['Alice', 'Bob', 'Charlie'],
      },
    };
    const result = calculateMatches(nameContext);
    expect(result).toEqual(['Alice', 'Bob', 'Charlie']);
  });

  it('should handle participants with empty liked names', () => {
    const nameContext = {
      likedNames: {
        user1: ['Alice', 'Bob'],
        user2: [],
        user3: ['Alice', 'Charlie'],
      },
    };
    const result = calculateMatches(nameContext);
    expect(result).toEqual([]);
  });
});