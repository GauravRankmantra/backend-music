const mongoose = require('mongoose');
const moment = require('moment');

const trafficSchema = new mongoose.Schema({
  ip: String,
  userAgent: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
  dayDate: {
    type: String,
  },
});

trafficSchema.pre('save', function (next) {
  if (!this.dayDate && this.createdAt) {
    this.dayDate = moment(this.createdAt).format('YYYY-MM-DD'); // Or '24 Apr' etc.
  }
  next();
});

module.exports = mongoose.model('Traffic', trafficSchema);
