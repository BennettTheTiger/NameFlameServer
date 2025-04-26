const logger = require('../logger');
const Name = require('../models/name');
const processNameResult = require('../routes/v1/names/utils');
const recommendNamesUsingFPTree = require('./recommendNamesUsingFPTree');
const _ = require('lodash');

async function recommendParticipantMatch(req, nameContext) {
    // Check if likedNames is initialized
    if (!nameContext.likedNames) {
        return [];
    }

    const usersLikedNames = nameContext.likedNames[req.systemUser.id] || [];
    const otherLikedNames = _.omit(nameContext.likedNames, req.systemUser.id);
    const likedNames = _.flatten(Object.values(otherLikedNames));
    const otherNames = _.difference(likedNames, usersLikedNames);

    const namesToInclude = _.sampleSize(otherNames, 1); // cap at 1 name for now could dial up later

    const nameResults = await Name.find({name: { $in: namesToInclude }});

    if (!nameResults || nameResults.length === 0) {
        logger.info('No names found for participant match');
        return [];
    }

    const names = nameResults.map(processNameResult);
    return names;
}

async function matchBatch(req) {
   const { limit = 10 } = req.query;
    const { nameContext } = req;

    // Parse the filter from nameContext
    const filter = nameContext.filter || {};

    // Build the MongoDB query based on the filter
    const mongoQuery = {};
    if (filter.startsWithLetter) {
        mongoQuery.name = { $regex: `^${filter.startsWithLetter}`, $options: 'i' };
    }
    if (filter.maxCharacters) {
        mongoQuery.$expr = { $lte: [{ $strLenCP: "$name" }, filter.maxCharacters] };
    }

    // Exclude names that the user has already liked
    const likedNames = nameContext.likedNames || new Map();
    const userLikedNames = likedNames[req.systemUser.id] || [];
    if (userLikedNames.length > 0) {
    mongoQuery.name = { ...mongoQuery.name, $nin: userLikedNames };
    }

    const sizeLimit = Math.min(parseInt(limit || 0, 10), 25);

    // Use MongoDB aggregation to apply the filter and sample the results
    const namesResults = await Name.aggregate([
        { $match: mongoQuery },
        { $sample: { size: sizeLimit } } // Randomly sample the results
    ]);

    let names = namesResults.map(processNameResult);

    // Filter out names that don't match the specified gender
    if (filter.gender && filter.gender !== 'neutral') {
    names = names.filter(name => name.gender === filter.gender);
    }

    // If there are not enough names, get more names
    while (names.length < sizeLimit) {
    const additionalNamesResult = await Name.aggregate([
        { $match: mongoQuery },
        { $sample: { size: sizeLimit - names.length } } // Randomly sample the remaining results
    ]).then(results => results.map(processNameResult));

    let additionalNames = additionalNamesResult.filter(name => !names.some(n => n.name === name.name));

    if (filter.gender && filter.gender !== 'neutral') {
        additionalNames = additionalNames.filter(name => name.gender === filter.gender);
    }

    names.push(...additionalNames);

    if (additionalNames.length === 0) {
        logger.info('No more names to fetch with filter', JSON.stringify(filter));
            break; // No more names to fetch didnt get enough names to meet the target sizeLimit
        }
    }

    const [recommendedNames, participantReferrals] = await Promise.all([
        recommendNamesUsingFPTree(req, nameContext),
        recommendParticipantMatch(req, nameContext)
    ]);

    const uniqueNames = _.uniqBy([...names, ...recommendedNames, ...participantReferrals], 'name');
    return _.sampleSize(uniqueNames, sizeLimit);
}

module.exports = matchBatch;
