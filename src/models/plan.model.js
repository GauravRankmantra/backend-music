const mongoose = require('mongoose');

const planSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true
    },
    uplodeLimit: {
      type: Number,
      required: true
    },
    downloadLimit: {
      type: Number,
      required: true
    },
    planValidity: {
      type: Number,
      required: true
    },
    streaming: {
      type: Number,
      require: true
    },
    price: {
      type: Number,
      required: true
    },
    quality: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Plan', planSchema);
