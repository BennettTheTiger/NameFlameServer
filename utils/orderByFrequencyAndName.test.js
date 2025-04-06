const orderByFrequencyAndName = require('./orderByFrequencyAndName');

describe('orderByFrequencyAndName', () => {
  it('should sort strings by frequency (descending) and then alphabetically (ascending)', () => {
    const input = ['Alice', 'Bob', 'Alice', 'Charlie', 'Bob', 'Alice', 'Charlie', 'Charlie', 'Bob', 'Bob'];
    const expectedOutput = [
        'Bob',
        'Bob',
        'Bob',
        'Bob',
        'Alice',
        'Alice',
        'Alice',
        'Charlie',
        'Charlie',
        'Charlie',
    ];

    const result = orderByFrequencyAndName(input);

    expect(result).toEqual(expectedOutput);
  });

  it('should handle an empty array', () => {
    const input = [];
    const expectedOutput = [];

    const result = orderByFrequencyAndName(input);

    expect(result).toEqual(expectedOutput);
  });

  it('should handle an array with one element', () => {
    const input = ['Alice'];
    const expectedOutput = ['Alice'];

    const result = orderByFrequencyAndName(input);

    expect(result).toEqual(expectedOutput);
  });

  it('should handle an array with all unique elements', () => {
    const input = ['Alice', 'Charlie', 'Bob'];
    const expectedOutput = [ 'Alice', 'Bob', 'Charlie'];

    const result = orderByFrequencyAndName(input);

    expect(result).toEqual(expectedOutput);
  });

  it('should handle an array with ties in frequency', () => {
    const input = ['Charlie', 'Alice', 'Bob', 'Alice', 'Charlie', 'Bob'];
    const expectedOutput = [
        'Alice',
        'Alice',
        'Bob',
        'Bob',
        'Charlie',
        'Charlie',
    ];

    const result = orderByFrequencyAndName(input);

    expect(result).toEqual(expectedOutput);
  });
});