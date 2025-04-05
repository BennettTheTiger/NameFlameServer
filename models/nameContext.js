const mongoose = require('mongoose');

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
    likedNames: { type: Object, default: {} },
    filter: NameFilterSchema
  }, {
      collection: 'name-contexts',
      timestamps: true
  });

// Ensure virtual fields are serialized
NameContextSchema.set('toJSON');
NameContextSchema.set('toObject');

const NameContext = mongoose.model('NameContext', NameContextSchema);

module.exports = NameContext;