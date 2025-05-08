const mongoose = require('mongoose');

const webUpdateSchema = new mongoose.Schema(
  {
    heading: {
      type: String,
      default: ''
    },
    subHeading: {
      type: String,
      default: ''
    },
    link: {
      type: String
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('WebUpdate', webUpdateSchema);
