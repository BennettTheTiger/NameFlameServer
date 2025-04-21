const mongoose = require('mongoose');

const popularitySchema = new mongoose.Schema({
  males: Number,
  females: Number
}, { _id: false });

const nameSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  usage: [{ type: String }],
  about: { type: String },
  meaning: { type: String },
  origin: { type: String },
  pronunciation: { type: String },
  popularity: {
    type: Map,
    of: popularitySchema
  }
}, {
  collection: 'names'
});

// Virtual field for gender
nameSchema.virtual('gender').get(function() {
  let maleCount = 0;
  let femaleCount = 0;

  this.popularity.forEach((value) => {
    maleCount += value.males || 0;
    femaleCount += value.females || 0;
  });

  if (maleCount > femaleCount) {
    return 'male';
  } else if (femaleCount > maleCount) {
    return 'female';
  } else {
    return 'neutral';
  }
});

// Ensure virtual fields are serialized
nameSchema.set('toJSON', { virtuals: true });
nameSchema.set('toObject', { virtuals: true });

const Name = mongoose.model('Name', nameSchema);

module.exports = Name;