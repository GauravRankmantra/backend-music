const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Video title is required'], // Make title required
    trim: true,

  },
  description: {
    type: String,
    trim: true,

  },
  url: {
    type: String,
    required: true
  },
  public_id: {
    type: String,
    required: true
  },
  resource_type: { // Typically 'video'
    type: String,
    default: 'video'
  },
  views: {
    type: Number,
    default: 0,
    min: 0
  },
  // Mongoose will automatically add createdAt and updatedAt fields
}, { timestamps: true }); // Automatically adds createdAt and updatedAt

module.exports = mongoose.model('Video', videoSchema); // Renamed model to 'Video'