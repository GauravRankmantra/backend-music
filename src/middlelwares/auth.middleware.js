const jwt = require('jsonwebtoken');
const { asyncHandler } = require('../utils/asyncHandler.js');
const User = require('../models/user.model.js');
require('dotenv').config();

module.exports.auth = asyncHandler(async (req, res, next) => {
  try {
    const { accessToken } = req.cookies;

    if (!accessToken) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: You Need to Login'
      });
    }

    const { _id } = await jwt.verify(accessToken, process.env.JWT_SECRET_KEY);

    const user = await User.findById(_id).select('-password -refreshToken');
  if (!user) {
            const error = new Error('Token is not valid');
            error.statusCode = 404;
            throw error;
          }
    req.user = user;
    next();
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Internal server error'
    });
  }
});

module.exports.checkToken = asyncHandler(async (req, res) => {
  res.set({
    'Cache-Control': 'no-store',
    Pragma: 'no-cache',
    Expires: '0'
  });
  try {
    const { accessToken } = req.cookies;

    if (!accessToken) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: No token provided'
      });
    }

    const { _id } = await jwt.verify(accessToken, process.env.JWT_SECRET_KEY);

    const user = await User.findById(_id).select('-password -refreshToken');

    if (!user) {
      const error = new Error('Token is not valid');
      error.statusCode = 404;
      throw error;
    }

    return res.status(200).json({ success: true, user: user });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Internal server error'
    });
  }
});

module.exports.checkAdminToken = asyncHandler(async (req, res) => {
  res.set({
    'Cache-Control': 'no-store',
    Pragma: 'no-cache',
    Expires: '0'
  });

  try {
    const { accessToken } = req.cookies;

    if (!accessToken) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: No token provided'
      });
    }

    const { _id } = await jwt.verify(accessToken, process.env.JWT_SECRET_KEY);

    const user = await User.findById(_id).select('-password -refreshToken');

    if (!user) {
      const error = new Error('Token is not valid');
      error.statusCode = 404;
      throw error;
    }
    if (user.role != 'admin') {
      const error = new Error('Only Admin access Allowed');
      error.statusCode = 404;
      throw error;
    }

    return res.status(200).json({ success: true, user: user });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Internal server error'
    });
  }
});
