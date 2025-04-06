const _ = require('lodash');
const NameContext = require('../models/nameContext');
const Name = require('../models/name');
const processNameResult = require('../routes/v1/names/utils');
const orderByFrequencyAndName = require('../utils/orderByFrequencyAndName');

class FPTreeNode {
    constructor(name) {
        this.name = name;
        this.count = 0;
        this.children = {};
    }

    addChild(name) {
        if (this.name === name) {
            // If the current node matches the name, increment its count
            this.count += 1;
            return this;
        }

        if (!this.children[name]) {
            // Create a new child node if it doesn't exist
            this.children[name] = new FPTreeNode(name);
        }

        // Increment the count of the child node
        this.children[name].count += 1;
        return this.children[name];
    }
}

/**
 * This function builds the FP-Tree from the liked names data structure.
 * @param {Object} likedNames - An object where keys are user IDs and values are arrays of names they liked.
 */
function buildFPTree(likedNames) {
  const root = new FPTreeNode(null);

  for (const userId in likedNames) {
    const names = likedNames[userId];
    let currentNode = root;

    // Sort names to ensure consistent tree structure
    const sortedNames = orderByFrequencyAndName(names);

    for (const name of sortedNames) {
      currentNode = currentNode.addChild(name);
    }
  }

  return root;
}

// This function mines the FP-Tree to find frequent patterns.
// It recursively traverses the tree and collects patterns that meet the minimum support threshold.
function mineFPTree(node, prefix = [], minSupport = 2) {
  const patterns = [];

  for (const name in node.children) {
    const child = node.children[name];
    const pattern = [...prefix, name];

    if (child.count >= minSupport) {
      patterns.push({ pattern, count: child.count });
      patterns.push(...mineFPTree(child, pattern, minSupport));
    }
  }

  return patterns;
}

async function recommendNamesUsingFPTree(req, context) {
    const nameContext = _.cloneDeep(context);
    const contextLikedNames = context.likedNames[req.systemUser.id] || [];
    const likedNames = nameContext.likedNames || {};

    const otherNameContexts = await NameContext.aggregate([
        { $match: { id: { $ne: nameContext.id } } },
        { $sample: { size: 20 } }, // Randomly select up to 20 documents
    ]);

  // Collect liked names from other name contexts
    otherNameContexts.forEach((context) => {
        const contextLikedNames = context.likedNames || {};
        for (const userId in contextLikedNames) {
            if (!likedNames[userId]) {
                likedNames[userId] = [];
            }
            likedNames[userId].push(...contextLikedNames[userId]);
        }
    });

    // Build the FP-Tree
    const fpTree = buildFPTree(likedNames);

    // Mine frequent patterns
    const frequentPatterns = mineFPTree(fpTree);

    // Filter patterns to exclude names already liked by the current user
    const recommendations = frequentPatterns
        .filter(({ pattern }) => !pattern.some(name => contextLikedNames.includes(name)))
        .flatMap(({ pattern }) => pattern);

    const uniqueRecommendations = _.uniq(recommendations);
    const namesToInclude = _.sampleSize(uniqueRecommendations, 10);
    const nameResults = await Name.find({ name: { $in: namesToInclude }});
    const processedResults = nameResults.map(processNameResult);

    return processedResults;
}

module.exports = recommendNamesUsingFPTree;