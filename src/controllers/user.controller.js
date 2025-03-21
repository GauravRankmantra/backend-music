const User = require('../models/user.model.js');
const { asyncHandler } = require('../utils/asyncHandler.js');
const { validateUser } = require('../utils/validateUser.js');
const { uploadFile } = require('../services/cloudinary.js');
const nodemailer = require('nodemailer');
const mongoose = require('mongoose');
const crypto = require('crypto');




module.exports.registerUser = asyncHandler(async (req, res, next) => {
  const { body, files } = req;
  validateUser(req, res);
  const {
    email,
    fullName,
    password,
    role,
    isFeatured,
    isVerified,
    popularity
  } = body;

  const userAvatar = files?.avatar || '';
  const userCoverImage = files?.coverImage || '';

  const avatar = await uploadFile(userAvatar[0]?.path);
  const coverImage = await uploadFile(userCoverImage[0]?.path || '');
  try {
    const user = new User({
      email,
      fullName,
      password,
      role,
      isFeatured,
      isVerified,
      popularity,
      avatar: avatar?.url || '',
      coverImage: coverImage?.url || ''
    });
    if (!user) return res.status(500).json({ message: 'user creation failed' });

    await user.save();
    return res.status(200).json({
      success: true,
      message: 'User Registered Successfully',
      user
    });
  } catch (error) {
    return res.status(500).json({ message: 'internal server error ', error });
  }
});
module.exports.newUsers = asyncHandler(async (req, res, next) => {
  const today = new Date();
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 7);

  try {
    // Query the User model for users created within the last 7 days
    const users = await User.aggregate([
      {
        $match: {
          createdAt: {
            $gte: sevenDaysAgo, // Find users created after 7 days ago
            $lte: today // Until today
          }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } // Group by date (yyyy-mm-dd)
          },
          count: { $sum: 1 } // Count the number of users created on each day
        }
      },
      { $sort: { _id: 1 } } // Sort by date in ascending order
    ]);

    // Send data to the frontend
    res.status(200).json({
      success: true,
      data: users.map((user) => ({
        day: user._id,
        newUsers: user.count
      }))
    });
  } catch (error) {
    return res.status(500).json({ message: 'Error fetching user data', error });
  }
});

module.exports.changePassword = asyncHandler(async (req, res, next) => {
  const { newPassword, oldPassword } = req.body;

  const user = req.user;

  const validatedUser = await User.findById(user._id);
  if (!validateUser)
    return res.status(404).json({ message: 'unauthorize access' });

  const isPasswordValid = await validatedUser.validatePassword(oldPassword);

  if (!isPasswordValid) {
    return res.status(400).send({
      success: false,
      message: 'Password is not correct'
    });
  }
  user.password = newPassword;
  const data = await user.save({ validateBeforeSave: false });
  if (data) {
    return res.status(200).send({
      success: true,
      message: 'Password changed succefully'
    });
  } else {
    return res.status(500).send({
      success: false,
      message: 'Error while updating password'
    });
  }
});
module.exports.updateUser = asyncHandler(async (req, res) => {
  const id = req.params;
  const { fullName, email, password } = req.params;
  const file = req.file;
  let coverImageUrl = '';

  if (file) {
    const coverImagePath = file.path; // Get the cover image path from Multer
    try {
      const coverImageFile = await uploadFile(coverImagePath); // Upload to Cloudinary
      coverImageUrl = coverImageFile ? coverImageFile.secure_url : ''; // Get Cloudinary URL
    } catch (error) {
      console.error('Error uploading cover image:', error);
      return res
        .status(500)
        .json({ message: 'Error uploading cover image', error });
    }
  }

  const user = await User.findById(id);
  if (!user)
    return res.status(404).json({ success: false, message: 'User not found' });
  if (fullName) user.fullName = fullName;
  if (email) user.email = email;
  if (password) user.password = password;
  if (coverImageUrl != '') user.coverImage = coverImageUrl;
  await user.save();
  return res
    .status(200)
    .json({ success: true, message: 'User created Successfully' });
});

module.exports.forgetPassword = asyncHandler(async (req, res) => {
  const user = req.user;
  const { email } = user;

  const validatedUser = await User.findById(user._id);

  if (!validatedUser) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }
  const otp = crypto.randomInt(100000, 999999).toString();

  user.otp = otp;
  user.otpExpires = Date.now() + 2 * 60 * 1000; // 2 minutes
  await user.save();
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Password Reset OTP',
    text: `Your OTP for password reset is ${otp}. It will expire in 2 minutes.`
  };
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      return res.status(500).json({
        success: false,
        message: 'Error sending email',
        error: error
      });
    }
    return res.status(200).json({
      success: true,
      message: 'OTP sent to your email'
    });
  });
});
module.exports.verifyOtp = asyncHandler(async (req, res) => {
  const { userOtp, newpassword } = req.body;
  const user = req.user;
  const validateUser = await User.findOne({
    _id: user._id,
    otp: userOtp,
    otpExpires: { $gt: new Date() }
  });

  if (!validateUser)
    return res
      .status(404)
      .json({ success: false, message: 'Invalid OTP or OTP expired' });
  validateUser.password = newpassword;
  validateUser.otp = undefined;
  validateUser.otpExpires = undefined;
  await validateUser.save();
  console.log('After storing user in db : ', validateUser);
  return res.status(200).json({
    success: true,
    message: 'Otp validate success and password updated'
  });
});

module.exports.featuredArtists = asyncHandler(async (req, res) => {
  try {
    const artists = await User.find({
      role: 'artist',
      isFeatured: 'true'
    });

    res.status(200).json(artists);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error });
  }
});

//Only for Admin
module.exports.updateUser2 = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const _id = new mongoose.Types.ObjectId(id.trim());
  const { role } = req.body;

  if (!role) {
    res.status(400);
    throw new Error('Role is required');
  }

  try {
    const updatedUser = await User.findByIdAndUpdate(
      _id,
      { role: role },
      { new: true, runValidators: false }
    );

    if (!updatedUser) {
      res.status(404);
      throw new Error('User not found');
    }

    return res.status(200).json({ message: 'success', updatedUser });
  } catch (error) {
    res.status(500);
    throw new Error(error);
  }
});

module.exports.getAllUsers = asyncHandler(async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query; // default page 1, limit 10

    const users = await User.find() // Replace with your actual DB query
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const totalUsers = await User.countDocuments(); // Total number of users
    res.json({
      totalUsers,
      totalPages: Math.ceil(totalUsers / limit),
      currentPage: page,
      users
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching users', error });
  }
});

module.exports.deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const _id = new mongoose.Types.ObjectId(id.trim());
  try {
    const user = await User.findOneAndDelete({ _id: _id });
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: 'User not found' });

    return res
      .status(200)
      .json({ success: true, message: 'User deleted Successfully' });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

module.exports.getAllArtist = asyncHandler(async (req, res) => {
  const allArtist = await User.find({ role: 'artist' });
  if (!allArtist)
    return res.status(404).json({ success: false, message: 'No Artist Found' });
  return res.status(200).json({ success: true, data: allArtist });
});

module.exports.getArtistSearch = asyncHandler(async (req, res) => {
  const { search = '' } = req.query; // Get the search query from the frontend (default to an empty string)

  // Use a case-insensitive regex to match artist names that contain the search query
  const allAlbum = await User.find({
    role: 'artist',
    fullName: { $regex: search, $options: 'i' } // Case-insensitive match
  });

  if (!allAlbum.length)
    return res.status(404).json({ success: false, message: 'No Artist Found' });

  return res.status(200).json({ success: true, data: allAlbum });
});
