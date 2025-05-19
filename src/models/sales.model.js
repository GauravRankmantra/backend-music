const mongoose = require('mongoose');

const salesSchema = new mongoose.Schema(
  {
    songId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Song',
      required: true
    },
    buyerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    amountPaid: {
      type: Number,
      required: true
    },
    platformShare: {
      type: Number,
      required: true
    },
    amountReceved: {
      type: Number,
      required: true
    },

    sellerEarning: {
      type: Number,
      required: true
    },
    adminEarning: {
      type: Number,
      required: true
    },
    currency: {
      type: String,
      default: 'USD'
    },
    stripeChargeId: {
      type: String,
      required: true
    },
    stripeId: {
      type: String,
      require: true
    },
    payoutStatus: {
      type: String,
      enum: ['pending', 'paid','rejected'],
      default: 'pending'
    },
    payoutDate: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Sales', salesSchema);
