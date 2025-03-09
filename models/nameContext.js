const mongoose = require('mongoose');
const { Schema } = mongoose;

const NameFilterSchema = new mongoose.Schema({
    startsWithLetter: { type: String, maxLength: 1 },
    maxCharacters: { type: Number, min: [1, 'A name must be at least one character'], max: [256, 'Be honest, no one wants to have to spell a name that long']},
    gender: { type: String, enum: ['male', 'female', 'neutral'], default: 'neutral' },
});

const NameContextSchema = new mongoose.Schema({
    name: { type: String, required: true },
    id: { type: String, unique: true },
    description: { type: String, default: '' },
    noun: { type: String },
    owner: { type: String, required: true },
    participants: [{ type: String }],
    likedNames: { type: Schema.Types.Map, of: [String] },
    filter: NameFilterSchema
  }, {
      collection: 'name-contexts',
      timestamps: true
  });

  // Virtual field for isOwner
NameContextSchema.virtual('isOwner').get(function() {
    if (!this.owner || !this._currentUserId) {
      return false;
    }
    return this.owner.toString() === this._currentUserId.toString();
  });

// Virtual field for matches
NameContextSchema.virtual('matches').get(function() {
    if (!this.likedNames) return new Set();

    const likedNamesArray = Array.from(this.likedNames.values());
    if (likedNamesArray.length === 0) return new Set();

    const intersection = likedNamesArray.reduce((acc, names) => {
      if (acc === null) return new Set(names);
      return new Set(names.filter(name => acc.has(name)));
    }, null);

    return intersection;
  });

  // Ensure virtual fields are serialized
  NameContextSchema.set('toJSON', { virtuals: true });
  NameContextSchema.set('toObject', { virtuals: true });

  NameContextSchema.methods.setCurrentUserId = function(userId) {
    this._currentUserId = userId;
  };

  const NameContext = mongoose.model('NameContext', NameContextSchema);

  module.exports = NameContext;