const mongoose = require('mongoose');
const { Schema } = mongoose;

const NameFilterSchema = new mongoose.Schema({
    startsWithLeter: { type: String, maxLength: 1 },
    maxCharacters: { type: Number, min: [1, 'A name must be at least one character'], max: [256, 'Be honest, no one wants to have to spell a name that long']},
    noun: { type: String },
    gender: { type: String, enum: ['male', 'female', 'non-binary'] }
});

const NameContext = mongoose.model('NameContext', new mongoose.Schema({
    name: { type: String, required: true },
    id: { type: String, unique: true },
    description: { type: String },
    owner: { type: Schema.Types.UUID, ref: 'User', required: true },
    participants: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    likedNames: { type: Schema.Types.Map, of: [{ type: Schema.Types.ObjectId, ref: 'Name' }] },
    filter: NameFilterSchema
  }, {
      collection: 'name-contexts',
      timestamps: true
  }));

  module.exports = NameContext;