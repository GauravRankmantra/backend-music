const validator = require('validator');
const User = require('../models/user.model.js');
const { asyncHandler } = require('../utils/asyncHandler');

const generateTokens = async (user, res) => {
  try {
    const accessToken = await user.generateAccessToken();
    const refreshToken = await user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    res.status(500).send({
      success: false,
      message: 'Something went wrong'
    });
  }
};

module.exports.logIn = asyncHandler(async (req, res, next) => {
  const { email = '', userName = '', password = '' } = req.body;


  if ((!email && !userName) || !password) {
    return res.status(400).json({
      success: false,
      message: 'Username or Email and Password are required.'
    });
  }

  const trimmedEmail = email.trim();
  const trimmedUserName = userName.trim().toLowerCase();

  if (trimmedEmail && !validator.isEmail(trimmedEmail)) {
    return res.status(400).json({
      success: false,
      message: 'Enter a valid email.'
    });
  }

  // Find user by email OR username
  const user = await User.findOne({
    $or: [{ email: trimmedEmail }, { userName: trimmedUserName }]
  })

  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Invalid credentials.'
    });
  }

  // Validate password
  const isPasswordValid = await user.validatePassword(password);
  if (!isPasswordValid) {
    return res.status(401).json({
      success: false,
      message: 'Invalid credentials.'
    });
  }

  // Generate Access & Refresh Tokens
  const { accessToken, refreshToken } = await generateTokens(user);

  // res.setHeader('Authorization', `Bearer ${accessToken}`);
  // res.setHeader('x-refresh-token', refreshToken);

  // Set the access token as a cookie
res.cookie('accessToken', accessToken, {
  httpOnly: true, 
  secure: true,  
  sameSite: 'none', 
  maxAge: 24*60 * 60 * 1000 
});

// Set the refresh token as a cookie
res.cookie('refreshToken', refreshToken, {
  httpOnly: true,
  secure: true,
  sameSite: 'none',
  maxAge: 7 * 24 * 60 * 60 * 1000 
});
res.setHeader('Access-Control-Allow-Credentials', 'true');


  return res.status(200).json({
    success: true,
    message: 'User Logged in Successfully',
    user: {
      ...user.toObject(), 
      password: undefined 
    },

  });
});

module.exports.logOut = asyncHandler(async (req, res, next) => {
  const user = req.user;
  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: No user found'
    });
  }
  


  await User.findByIdAndUpdate(user._id, { refreshToken: '' });

res.clearCookie("accessToken").clearCookie("refreshToken");
  return res.status(200).json({
    success: true,
    message: 'User logged out successfully'
  });
});

module.exports.refreshToken = asyncHandler(async (req, res, next) => {
  const { refreshToken } = req.cookies;

  if (!refreshToken) {
    return res.status(403).json({ message: 'Refresh Token not found' });
  }

  // Find user with matching refresh token
  const user = await User.findOne({ refreshToken });

  if (!user) {
    return res.status(403).json({ message: 'Invalid Refresh Token' });
  }

  try {
    // Verify refresh token
    jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    // Generate new access token
    const accessToken = user.generateAccessToken();

    // Send new tokens
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    });

    return res.status(200).json({
      success: true,
      message: 'Access token refreshed successfully',
    });
  } catch (error) {
    return res.status(403).json({ message: 'Invalid Refresh Token' });
  }
});
