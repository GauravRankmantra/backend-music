const mongoose = require('mongoose');

const trafficSchema = new mongoose.Schema(
  {
    day: { type: String, required: true }, // e.g., "23 Apr"
    dayDate: { type: Date, required: true, unique: true }, // used for querying
    totalVisits: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Traffic', trafficSchema);
