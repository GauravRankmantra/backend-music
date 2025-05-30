const mongoose = require('mongoose');

const donationSchema = new mongoose.Schema({
  name: String,
  email: String,
  phone: String,
  amount: Number,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Donation', donationSchema);
