const mongoose = require('mongoose');
const validator = require('validator');
const mongooseAggregatePaginate = require('mongoose-aggregate-paginate-v2');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      unique: true,
      trim: true,
      lowercase: true,
      maxLength: 50
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
      index: true,
      maxLength: 50
    },
    password: {
      type: String,
      required: function () {
        return !this.googleId && !this.facebookId;
      },
      trim: true
    },
    
    role: {
      type: String,
      enum: ['user', 'artist', 'admin'],
      default: 'user'
    },
    isFeatured: {
      type: Boolean,
      default: false
    },
    avatar: {
      type: String,
      default: ''
    },
    plan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Plan'
    },
    purchasedSongs: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Song'
      }
    ],
    paymentDate: {
      type: Date,
      default: ''
    },
    uploadedSongsThisMonth: {
      type: Number,
      default: 0
    },
    downloadedSongsThisMonth: {
      type: Number,
      default: 0
    },
    coverImage: {
      type: String,
      default: ''
    },
    bio: {
      type: String,
      trim: true,
      maxLength: 500,
      default: ''
    },

    popularity: {
      type: Number,
      default: 0
    },
    otp: { type: String, default: 0 },
    otpExpires: { type: Date, default: '' },
    isVerified: {
      type: Boolean,
      default: false
    },
    songsHistory: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Song',
        index: true
      }
    ],
    googleId: { type: String, unique: true, sparse: true },
    facebookId: { type: String, unique: true, sparse: true },
    profileColor: {
      type: String,
      default: ''
    },
    refreshToken: {
      type: String
    }
  },
  { timestamps: true }
);

// 🔒 Pre-save Hook: Hash Password Before Saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// 🔑 Validate Password
userSchema.methods.validatePassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

// 🎫 Generate Access Token
userSchema.methods.generateAccessToken = async function () {
  return jwt.sign(
    { _id: this._id, role: this.role },
    process.env.JWT_SECRET_KEY,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRE
    }
  );
};

// 🔄 Generate Refresh Token
userSchema.methods.generateRefreshToken = async function () {
  return jwt.sign(
    { _id: this._id, role: this.role },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRE }
  );
};

// Instance method to check if the billing cycle has ended
userSchema.methods.isBillingCycleEnded = function () {
  const currentDate = new Date();
  const paymentDate = new Date(this.paymentDate);
  const nextBillingDate = new Date(
    paymentDate.setDate(paymentDate.getDate() + 30)
  );

  return currentDate >= nextBillingDate;
};

// Method to reset uploaded/downloaded counts
userSchema.methods.resetMonthlyUsage = function () {
  this.uploadedSongsThisMonth = 0;
  this.downloadedSongsThisMonth = 0;
  this.paymentDate = new Date(); // Reset the payment date when resetting the cycle
  return this.save(); // Save the updates to the database
};

userSchema.plugin(mongooseAggregatePaginate);

module.exports = mongoose.model('User', userSchema);
