const mongoose = require('mongoose');

const trafficSchema  = new mongoose.Schema(
  {
    day: { type: String, required: true }, 
    totalVisits: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Traffic', trafficSchema );
