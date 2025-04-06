const _ = require('lodash');

function orderByFrequencyAndName(strings) {
  const frequencyMap = _.countBy(strings);

  const frequencyArray = Object.entries(frequencyMap).map(([name, count]) => ({
    name,
    count,
  }));

  const sortedArray = _.orderBy(frequencyArray, ['count', 'name'], ['desc', 'asc']);

  // Flatten back into a sorted list of strings
  return sortedArray.flatMap(({ name, count }) => Array(count).fill(name));
}

module.exports = orderByFrequencyAndName;