const mongoose = require('mongoose');

const footerSchema = new mongoose.Schema(
  {
    mainHeading: {
      type: String,
      default: '',
    },
    links: [ // 'links' should be an array of objects
      { // Each object in the 'links' array will have 'heading' and 'link' properties
        heading: {
          type: String,
          required: true,
        },
        link: {
          type: String,
          required: true, 
        },
      },
    ],
    subscribe: {
      type: String, 
      default: 'Subscribe to our Newsletter' 
    },

  },
  { timestamps: true } 
);

module.exports = mongoose.model('Footer', footerSchema);