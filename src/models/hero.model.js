const mongoose = require('mongoose');

const heroSchema = new mongoose.Schema(
  {
    heading: {
      type: String
    },
    subHeading: {
      type: String
    },
    coverImage: {
      type: String
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Hero', heroSchema);
