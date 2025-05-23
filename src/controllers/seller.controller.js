const User = require('../models/user.model.js'); // Assuming your model is in models/user.model.js
const Sale = require('../models/sales.model.js');
const { asyncHandler } = require('../utils/asyncHandler.js'); // You'll need to create this utility

// Utility for handling API errors
class ApiError extends Error {
  constructor(
    statusCode,
    message = 'Something went wrong',
    errors = [],
    stack = ''
  ) {
    super(message);
    this.statusCode = statusCode;
    this.data = null;
    this.message = message;
    this.success = false;
    this.errors = errors;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

// Utility for standardized API responses
class ApiResponse {
  constructor(statusCode, data, message = 'Success') {
    this.statusCode = statusCode;
    this.data = data;
    this.message = message;
    this.success = statusCode < 400;
  }
}

// @desc    Get users by verification state
// @route   GET /api/users/verification-requests/:state
// @access  Admin
const getVerificationRequests = asyncHandler(async (req, res) => {
  const { state } = req.params; // 'pending', 'rejected', 'no'

  if (!['pending', 'rejected', 'no'].includes(state)) {
    throw new ApiError(400, 'Invalid verification state provided.');
  }

  const users = await User.find({ verificationState: state }).select(
    '-password -refreshToken -otp -otpExpires'
  );

  if (!users || users.length === 0) {
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          [],
          `No users found with verification state: ${state}`
        )
      );
  }

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        users,
        `Users with verification state '${state}' fetched successfully.`
      )
    );
});

// @desc    Get active sellers with their sales statistics
// @route   GET /api/users/active-sellers
// @access  Public (or Authenticated User/Admin, depending on your requirements)
const getActiveSellers = asyncHandler(async (req, res) => {
  const activeSellers = await User.aggregate([
    {
      $match: {
        isVerified: true
      }
    },
    {
      $lookup: {
        from: 'sales', // Name of the sales collection in MongoDB
        localField: '_id',
        foreignField: 'sellerId',
        as: 'sellerSales'
      }
    },
    {
      $addFields: {
        totalSellerEarnings: { $sum: '$sellerSales.sellerEarning' },
        totalSongsSold: { $size: '$sellerSales' } // Count the number of sales documents
      }
    },
    {
      $project: {
        _id: 1,
        fullName: 1,
        sellerSales: 1,

        coverImage: 1,

        popularity: 1,
        totalSellerEarnings: 1,
        totalSongsSold: 1,

        stripeId: 1,
        paypalId: 1,
        phoneNumber: 1,
        address: 1,

        admin: 1
      }
    }
  ]);

  if (!activeSellers || activeSellers.length === 0) {
    return res
      .status(200)
      .json(new ApiResponse(200, [], 'No active sellers found.'));
  }

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        activeSellers,
        'Active sellers with sales stats fetched successfully.'
      )
    );
});

const getDisableSellers = asyncHandler(async (req, res) => {
  const activeSellers = await User.aggregate([
    {
      $match: {
        verificationState: 'rejected'
      }
    },
    {
      $lookup: {
        from: 'sales', // Name of the sales collection in MongoDB
        localField: '_id',
        foreignField: 'sellerId',
        as: 'sellerSales'
      }
    },
    {
      $addFields: {
        totalSellerEarnings: { $sum: '$sellerSales.sellerEarning' },
        totalSongsSold: { $size: '$sellerSales' } // Count the number of sales documents
      }
    },
    {
      $project: {
        _id: 1,
        fullName: 1,
        sellerSales: 1,

        coverImage: 1,

        popularity: 1,
        totalSellerEarnings: 1,
        totalSongsSold: 1,

        stripeId: 1,
        paypalId: 1,
        phoneNumber: 1,
        address: 1,

        admin: 1
      }
    }
  ]);

  if (!activeSellers || activeSellers.length === 0) {
    return res
      .status(200)
      .json(new ApiResponse(200, [], 'No active sellers found.'));
  }

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        activeSellers,
        'Active sellers with sales stats fetched successfully.'
      )
    );
});

// @desc    Confirm a user's verification request
// @route   POST /api/users/confirm-request
// @access  Admin
const confirmRequest = asyncHandler(async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    throw new ApiError(400, 'User ID is required to confirm the request.');
  }

  const user = await User.findById(userId);

  if (!user) {
    throw new ApiError(404, 'User not found.');
  }

  if (user.isVerified) {
    return res
      .status(200)
      .json(new ApiResponse(200, user, 'User is already verified.'));
  }

  user.isVerified = true;
  user.verificationState = 'no'; // Assuming 'no' means no longer pending/rejected and now verified
  await user.save({ validateBeforeSave: false }); // Skip validation to avoid issues if password is not present for social logins

  res
    .status(200)
    .json(
      new ApiResponse(200, user, 'User verification confirmed successfully.')
    );
});

// @desc    Get total count of pending verification requests
// @route   GET /api/users/pending-requests/count
// @access  Admin
const getPendingRequestsCount = asyncHandler(async (req, res) => {
  const count = await User.countDocuments({ verificationState: 'pending' });

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { count },
        'Total pending verification requests fetched successfully.'
      )
    );
});

// @desc    Get total count of active sellers (isVerified: true, role: 'artist')
// @route   GET /api/users/active-sellers/count
// @access  Public (or Authenticated User/Admin)
const getActiveSellersCount = asyncHandler(async (req, res) => {
  const count = await User.countDocuments({ isVerified: true });

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { count },
        'Total active sellers count fetched successfully.'
      )
    );
});

const getRejectedSellerCount = asyncHandler(async (req, res) => {
  const count = await User.countDocuments({ verificationState: 'rejected' });

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { count },
        'Total rejected sellers count fetched successfully.'
      )
    );
});

const disableRequest = asyncHandler(async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    throw new ApiError(400, 'User ID is required to confirm the request.');
  }

  const user = await User.findById(userId);

  if (!user) {
    throw new ApiError(404, 'User not found.');
  }

  user.isVerified = false;
  user.verificationState = 'rejected'; // Assuming 'no' means no longer pending/rejected and now verified
  await user.save({ validateBeforeSave: false }); // Skip validation to avoid issues if password is not present for social logins

  res
    .status(200)
    .json(
      new ApiResponse(200, user, 'User verification confirmed successfully.')
    );
});

module.exports = {
  getVerificationRequests,
  getActiveSellers,
  confirmRequest,
  getPendingRequestsCount, // Add this
  getActiveSellersCount, // Add this
  disableRequest,
  getDisableSellers,
  getRejectedSellerCount
};
