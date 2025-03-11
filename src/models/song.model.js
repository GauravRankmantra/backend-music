const mongoose = require('mongoose');

const songSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      index: true,
      trim: true
    },
    rank:{
      type:String,
      default:0
    },
    artist: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    duration: {
      String: Number
    },
    album:{
      type:mongoose.Schema.Types.ObjectId,
      ref:"Album"

    },
    audioUrls: {
      high: { type: String },
      low: {
        type: String,
        required: true
      }
    },

    coverImage: {
      type: String
    },
    genre: {
      type: mongoose.Types.ObjectId,
      ref:"Genre"
    },
    plays: {
      type: Number,
      default: 0
    },
    isPublished: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

const Song = new mongoose.model('Song', songSchema);
module.exports = Song;
