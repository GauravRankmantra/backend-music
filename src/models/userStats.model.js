const mongoose = require('mongoose');

const userStatsSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true // Good for querying stats by user
  },
  date: {
    type: Date,
    required: true,
    default: Date.now,
    index: true // Good for querying stats by date or date ranges
  },
  downloads: {
    type: Number,
    default: 0
  },
  purchases: {
    type: Number,
    default: 0
  },
  plays: { // Add tracking for plays
    type: Number,
    default: 0
  },
  revenue: {
    type: Number,
    default: 0
  },

  purchaseRevenue: {
    type: Number,
    default: 0
  },
  subscriptionRevenue: {
    type: Number,
    default: 0
  },

  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Ensure uniqueness for user and date to avoid duplicate entries for the same day
userStatsSchema.index({ user: 1, date: 1 }, { unique: true });

const UserStats = mongoose.model('UserStats', userStatsSchema);

module.exports = UserStats;