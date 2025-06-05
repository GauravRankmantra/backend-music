const mongoose = require('mongoose');

const feeDetailSchema = new mongoose.Schema(
  {
    amount: { type: Number, required: true },
    application: { type: String, default: null },
    currency: { type: String },
    description: { type: String },
    type: { type: String }
  },
  { _id: false }
);

const saleSchema = new mongoose.Schema(
  {
    // Buyer & song info
    buyerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    songId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Song'
    },
    album: String,

    // Earning breakdown
    adminEarning: Number,
    sellerEarning: Number,

    currency: String,
    exchangeRate: Number,

    // Receipt and Stripe reference IDs
    receiptUrl: String,
    stripeChargeId: String,
    stripeId: String,

    // Buyer details
    buyerEmail: String,
    buyerCountry: String,
    cardLast4: String,
    cardBrand: String,
    cardNetwork: String,

    // Payment details
    paymentIntentId: String,
    customerFacingAmount: String,
    customerFacingCurrency: String,
    amountReceived: String,
    paymentStatus: String,
    paymentMethodType: String,
    receiptEmail: String,
    createdTimestamp: Number,
    createdDateTime: Date,
    latestChargeId: String,
    description: String,
    customer: mongoose.Schema.Types.Mixed,
    captureMethod: String,

    // Transaction details
    balanceTransactionId: String,
    processedAmount: String,
    processedCurrency: String,
    netAmount: String,
    feeAmount: String,
    feeCurrency: String,
    originalCurrency: String,
    convertedCurrency: String,
    balanceType: String,
    availableOnTimestamp: Number,
    availableOnDateTime: Date,
    transactionCreatedTimestamp: Number,
    transactionCreatedDateTime: Date,
    reportingCategory: String,
    transactionStatus: String,
    transactionType: String,
    feeDetails: [feeDetailSchema]
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Sale', saleSchema);
