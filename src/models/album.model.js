const mongoose = require('mongoose');

const albumSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxLength: 100
    },
    artist: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    company: {
      type: String,
      default:''
    },
    coverImage: {
      type: String,
      default:''
    },
    genre: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Genre'
    },
    releaseDate: {
      type: Date,
      default: Date.now()
    },
    isPublished: {
      type: Boolean,
      default: true
    },
    isFeatured: {
      type: Boolean,
      default: false
    },
    isTranding: {
      type: Boolean,
      default: false
    },
    songs: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Song' }]
  },
  { timestamps: true }
);

module.exports = mongoose.model('Album', albumSchema);
