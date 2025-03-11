const mongoose = require('mongoose');

const followerSchema = new mongoose.Schema(
  {
    artist: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    follower: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Follower', followerSchema);
