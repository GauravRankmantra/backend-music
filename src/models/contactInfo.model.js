// models/ContactInfo.js
const mongoose = require('mongoose');

const contactInfoSchema = new mongoose.Schema(
  {
    phone: String,
    email: String,
    address: String,
    facebook: String,
    instagram: String,
    Twitter: String,
    mapEmbedLink: String
  },
  { timestamps: true }
);

module.exports = mongoose.model('ContactInfo', contactInfoSchema);
