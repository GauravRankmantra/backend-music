const mongoose = require('mongoose');

const generSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true
    },
    discription: {
      type: String
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Genre', generSchema);
