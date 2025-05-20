const mongoose = require('mongoose');

const featuredVideoSchema = new mongoose.Schema({
  title: {
    type: String,
    default: 'Featured Video'
  },
  url: {
    type: String,
    required: true
  },
  public_id: {
    type: String,
    required: true
  },
  resource_type: {
    type: String,
    default: 'video'
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('FeaturedVideo', featuredVideoSchema);
