const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema(
  {
    name: {
      type: String,

      required: true
    },
    email: {
      type: String,
      required: true
    },
    comment: {
      type: String,
      require: true
    },
    album: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Album'
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Comment', commentSchema);
