const User = require('../models/user.model.js');
const Song = require('../models/song.model.js');
const { asyncHandler } = require('../utils/asyncHandler.js');
const { validateUser } = require('../utils/validateUser.js');
const { uploadFile } = require('../services/cloudinary.js');
const nodemailer = require('nodemailer');
const mongoose = require('mongoose');
const crypto = require('crypto');
const formatDuration = require('../utils/formateDuration.js');

module.exports.searchUser = asyncHandler(async (req, res) => {
  const query = req.query.query?.toLowerCase();

  if (!query || query.length < 3) {
    return res.status(400).json({ message: 'Query too short' });
  }

  try {
    const users = await User.find({
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } }
      ]
    });

    res.json({ users });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports.registerUser = asyncHandler(async (req, res, next) => {
  const { body, files } = req;
  validateUser(req, res);
  const {
    email,
    fullName,
    password,
    role,
    isFeatured,
    isTrending,
    isVerified,
    popularity,
    admin
  } = body;

  if (role === 'user' || role === 'admin') {
    const users = await User.find({ email: email });
    if (users.length > 0) {
      return res.status(400).json({ message: 'Email already exists' });
    }
  }
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
      isTrending,
      isVerified,
      popularity,
      admin,
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
    if (error.code === 11000) {
      // Duplicate key error
      const duplicateField = Object.keys(error.keyValue)[0]; // Get the field that caused the error
      return res.status(400).json({
        success: false,
        message: `${duplicateField.charAt(0).toUpperCase() + duplicateField.slice(1)} already exists :)`
      });
    } else {
      // Other errors
      return res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
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
module.exports.addHistory = asyncHandler(async (req, res) => {
  const { songId } = req.body;
  const userId = req.user?._id;

  if (!mongoose.Types.ObjectId.isValid(songId)) {
    return res.status(400).json({ message: 'Invalid Song ID format' });
  }

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized user' });
  }

  const [user, song] = await Promise.all([
    User.findById(userId),
    Song.findById(songId)
  ]);

  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  if (!song) {
    return res.status(404).json({ message: 'Song not found' });
  }

  // ======= Update topGenre =======
  const genreId = song.genre?.toString();
  console.log(genreId);

  if (genreId) {
    const existingGenre = user.topGenre?.find(
      (entry) => entry.genre?.toString() === genreId
    );
    console.log(existingGenre);

    if (existingGenre) {
      existingGenre.plays = (existingGenre.plays || 0) + 1;
      existingGenre.date = new Date();
    } else {
      user.topGenre.push({
        genre: genreId,
        plays: 1,
        date: new Date()
      });
    }
  }

  // ======= Update allTimeSong =======
  const existingAllTime = user.allTimeSong?.find(
    (entry) => entry.song?.toString() === songId
  );

  if (existingAllTime) {
    existingAllTime.plays = (existingAllTime.plays || 0) + 1;
    existingAllTime.date = new Date();
  } else {
    user.allTimeSong.push({
      song: songId,
      plays: 1,
      date: new Date()
    });
  }

  // ======= Update songsHistory (last 10 unique songs) =======
  user.songsHistory = user.songsHistory || [];
  const historyIndex = user.songsHistory.findIndex(
    (entry) => entry.toString() === songId
  );

  if (historyIndex === -1) {
    user.songsHistory.push(songId);
    if (user.songsHistory.length > 10) {
      user.songsHistory.shift(); // Remove oldest
    }
  }

  // Save changes once
  await user.save();

  res.status(200).json({
    message: 'Song successfully added to history and stats',
    updated: true
  });
});

module.exports.addVerifyReq = asyncHandler(async (req, res) => {
  const user = req.user;

  if (!user) {
    return res
      .status(401)
      .json({ message: 'User not authenticated or not available.' });
  }

  const updatedUser = await User.findByIdAndUpdate(
    user._id,
    { verificationState: 'pending' },
    { new: true }
  );

  if (!updatedUser) {
    return res.status(404).json({
      message: 'User not found or unable to update verification state.'
    });
  }

  res.status(200).json({
    message: 'Verification request submitted successfully.',
    user: updatedUser
  });
});
module.exports.getHistory = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  try {
    const user = await User.findById(userId).populate({
      path: 'songsHistory',
      select:
        '_id title price freeDownload coverImage artist duration audioUrls createdAt updatedAt',
      populate: {
        path: 'artist',
        select: 'fullName'
      }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({
      success: true,
      data: user.songsHistory
    });
  } catch (error) {
    console.error('Error fetching song history:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});
module.exports.checkEmail = asyncHandler(async (req, res) => {
  const { email } = req.body;
  console.log(email);

  if (!email) {
    return res
      .status(400)
      .json({ success: false, message: 'Please provide an email' });
  }

  try {
    const user = await User.findOne({ email: email }); // Await the query

    if (!user) {
      return res
        .status(200)
        .json({ success: true, message: 'New email', data: { exists: false } });
    }

    return res.status(200).json({
      success: false,
      message: 'This email is already registered, login instead.',
      data: { exists: true }
    });
  } catch (error) {
    console.error('Error checking email:', error);
    return res
      .status(500)
      .json({ success: false, message: 'Internal server error' });
  }
});
module.exports.getOtp = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const otp = crypto.randomInt(100000, 999999).toString();

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    const mailOptions = {
      from: `"ODG Music Support" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Your OTP Code from ODG Music',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #4F46E5;">Your OTP Code</h2>
          <p>Hello,</p>
          <p>Use the following OTP to complete your request:</p>
          <h3 style="background: #f4f4f4; padding: 10px; display: inline-block; letter-spacing: 2px;">${otp}</h3>
          <p>This OTP will expire in <strong>2 minutes</strong>.</p>
          <p>If you didn’t request this, you can safely ignore this email.</p>
          <hr style="margin: 30px 0;">
          <small>ODG Music Team | ${process.env.EMAIL_USER}</small>
        </div>
      `
    };

    // Send the email
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('Email send error:', error);
        return res.status(500).json({
          success: false,
          message: 'Error sending email',
          error: error.message
        });
      }

      console.log('Email sent:', info);
      return res.status(200).json({
        success: true,
        message: 'OTP sent to your email',
        data: { otp }
      });
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Something went wrong. Please try again later.',
      error: error.message
    });
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
  const id = req.params.id;
  console.log(id);
  const {
    fullName,
    email,
    password,
    address,
    phoneNumber,
    instagram,
    facebook,
    isFeatured,
    isTrending,
    twitter
  } = req.body;
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

  const user = await User.findById(new mongoose.Types.ObjectId(id));
  if (!user)
    return res.status(404).json({ success: false, message: 'User not found' });

  if (
    !fullName &&
    !email &&
    !password &&
    !address &&
    !phoneNumber &&
    !instagram &&
    !facebook &&
    !twitter &&
    coverImageUrl == ''
  )
    return res.status(400).json({ success: false, message: 'Empty fields !' });
  if (fullName) user.fullName = fullName;
  if (email) user.email = email;
  if (password) user.password = password;
  if (address) user.address = address;
  if (phoneNumber) user.phoneNumber = phoneNumber;
  if (instagram) user.instagram = instagram;
  if (facebook) user.facebook = facebook;
  if (twitter) user.twitter = twitter;
  if (isFeatured) user.isFeatured = isFeatured;
  if (isTrending) user.isTrending = isTrending;

  if (coverImageUrl != '') user.coverImage = coverImageUrl;
  const updatedUser = await user.save();
  // Create a new object to exclude the password field
  const userWithoutPassword = { ...updatedUser.toObject() };
  delete userWithoutPassword.password;
  delete userWithoutPassword.allTimeSong;

  return res.status(200).json({
    success: true,
    message: ' Updated Successfully',
    data: userWithoutPassword
  });
});
module.exports.forgetPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  try {
    // Find the user by email
    const user = await User.findOne({ email });

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: 'User not found' });
    }

    // Generate OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    user.otp = otp;
    user.otpExpires = Date.now() + 2 * 60 * 1000; // OTP expires in 2 minutes

    // Save the updated user with the OTP and expiry time
    await user.save();

    // Setup nodemailer transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    // Email options
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Password Reset OTP',
      text: `Your OTP for password reset is ${otp}. It will expire in 2 minutes.`
    };

    // Send the email
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        return res.status(500).json({
          success: false,
          message: 'Error sending email',
          error: error.message
        });
      }

      // Successfully sent email
      return res.status(200).json({
        success: true,
        message: 'OTP sent to your email'
      });
    });
  } catch (error) {
    // Handle any errors
    return res.status(500).json({
      success: false,
      message: 'Something went wrong. Please try again later.',
      error: error.message
    });
  }
});

module.exports.getPurchasedSong = asyncHandler(async (req, res) => {
  try {
    // Find the user by ID from the request (assuming authentication middleware)
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get the list of purchased songs (IDs)
    const purchasedSongIds = user.purchasedSongs;

    if (!purchasedSongIds || purchasedSongIds.length === 0) {
      return res
        .status(200)
        .json({ message: 'No purchased songs found', purchasedSongs: [] });
    }

    const pSongs = await Song.find({ _id: { $in: purchasedSongIds } })
      .populate({
        path: 'artist',
        select: 'fullName bio'
      })
      .populate({
        path: 'album',
        select: 'title coverImage'
      });

    const purchasedSongs = pSongs.map((song) => ({
      ...song.toObject(),
      durationFormatted: formatDuration(song.duration)
    }));

    return res.status(200).json({
      success: true,
      purchasedSongs
    });
  } catch (error) {
    console.error('Error fetching purchased songs:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});
module.exports.addPurchaseSong = asyncHandler(async (req, res) => {
  const userId = req.user._id; // Set by your verifyToken middleware
  const { songId } = req.body;

  if (!songId) {
    return res.status(400).json({ message: 'songId is required' });
  }

  // Optional: check if song exists
  // const song = await Song.findById(songId);
  // if (!song) {
  //   return res.status(404).json({ message: "Song not found" });
  // }

  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  if (user.purchasedSongs.includes(songId)) {
    return res.status(200).json({ message: 'Song already purchased' });
  }

  user.purchasedSongs.push(songId);
  await user.save();

  res
    .status(200)
    .json({ message: 'Song successfully added to purchased list' });
});
module.exports.verifyOtp = asyncHandler(async (req, res) => {
  const { email, otp, newPassword } = req.body;
  const user = await User.findOne({ email: email });

  const validateUser = await User.findOne({
    _id: user._id,
    otp: otp,
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

    res.status(200).json({ success: true, data: artists });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error });
  }
});

module.exports.searchArtist = asyncHandler(async (req, res) => {
  try {
    const { query } = req.query;

    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    const artist = await User.find({
      fullName: { $regex: query, $options: 'i' } // Case-insensitive search
    });

    if (!albums || artist.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No Artist found matching your search.'
      });
    }

    res.status(200).json({
      success: true,
      message: `Found ${artist.length} Artist(s) matching "${query}".`,
      data: albums
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'An error occurred while searching for Artist.'
    });
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
    const { page = 1, limit = 10, role } = req.query;

    const query = {};
    if (role) {
      query.role = role; // dynamically add role filter
    }

    const users = await User.find(query)
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const totalUsers = await User.countDocuments(query); // count based on filter

    res.json({
      totalUsers,
      totalPages: Math.ceil(totalUsers / limit),
      currentPage: Number(page),
      users
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching users', error });
  }
});

module.exports.getAllArtist = asyncHandler(async (req, res) => {
  try {
    const { page = 1, limit = 10, role } = req.query;

    const query = { role: 'artist' };
    if (role) {
      query.role = role; // dynamically add role filter
    }

    const users = await User.find(query)
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const totalUsers = await User.countDocuments(query);

    res.json({
      totalUsers,
      totalPages: Math.ceil(totalUsers / limit),
      currentPage: Number(page),
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

module.exports.getArtistDetail = asyncHandler(async (req, res) => {
  const id = req.params.id;
  const artistId = new mongoose.Types.ObjectId(id.trim());
  if (!id)
    return res.status(400).json({ success: false, message: 'No id provided' });

  try {
    const artistDetail = await User.aggregate([
      {
        $match: { _id: artistId } // Match the artist by ID
      },
      {
        $lookup: {
          from: 'songs', // Collection name of the songs
          localField: '_id', // Artist ID in the User collection
          foreignField: 'artist', // Artist ID in the Song collection
          as: 'songs', // Output field for matching songs
          pipeline: [
            // Add a pipeline to the songs lookup
            {
              $lookup: {
                from: 'users', // Collection name of the users (artists)
                localField: 'artist', // Artist ID in the Song document
                foreignField: '_id', // User ID in the User document
                as: 'artistDetails' // Output field for artist details
              }
            },
            {
              $unwind: '$artistDetails' // Deconstruct the artistDetails array
            },
            {
              $project: {
                _id: 1,
                title: 1,
                rank: 1,
                duration: 1,
                album: 1,
                audioUrls: 1,
                coverImage: 1,
                genre: 1,
                plays: 1,
                isPublished: 1,
                createdAt: 1,
                updatedAt: 1,
                __v: 1,
                artist: '$artistDetails.fullName'
              }
            }
          ]
        }
      }
    ]);

    if (!artistDetail || artistDetail.length === 0)
      return res
        .status(404)
        .json({ success: false, message: 'No artist found' });

    return res.status(200).json({ success: true, data: artistDetail[0] });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching artist details'
    });
  }
});

module.exports.getSongByUserId = asyncHandler(async (req, res) => {
  const id = req.params.id;

  if (!id) {
    return res
      .status(400)
      .json({ success: false, message: 'No artist ID provided' });
  }

  try {
    const artistId = new mongoose.Types.ObjectId(id.trim());

    const songs = await Song.find({ artist: { $in: [artistId] } }).populate({
      path: 'genre',
      select: 'name _id'
    });

    return res.status(200).json({
      success: true,
      songs
    });
  } catch (error) {
    console.error('Error fetching songs by artist ID:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching songs by artist'
    });
  }
});

module.exports.addWithdrawalMethod = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { paypalId, stripeId } = req.body;

  if (!paypalId && !stripeId) {
    return res.status(400).json({
      success: false,
      message: 'At least one method (PayPal or Stripe) is required.'
    });
  }

  const updatedUser = await User.findByIdAndUpdate(
    userId,
    {
      ...(paypalId !== undefined && { paypalId }),
      ...(stripeId !== undefined && { stripeId })
    },
    { new: true }
  ).select('paypalId stripeId');

  res.status(200).json({
    success: true,
    message: 'Withdrawal method updated successfully.',
    data: updatedUser
  });
});

// ✅ Get Withdrawal Methods
module.exports.getWithdrawalMethod = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const user = await User.findById(userId).select('paypalId stripeId');

  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  res.status(200).json({
    success: true,
    data: {
      paypalId: user.paypalId,
      stripeId: user.stripeId
    }
  });
});

// ✅ Delete One or Both Withdrawal Methods
module.exports.deleteWithdrawalMethod = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { method } = req.query;

  const update = {};
  if (method === 'paypal') {
    update.paypalId = null;
  } else if (method === 'stripe') {
    update.stripeId = null;
  } else if (method === 'all') {
    update.paypalId = null;
    update.stripeId = null;
  } else {
    return res.status(400).json({
      success: false,
      message: 'Invalid method. Use "paypal", "stripe", or "all".'
    });
  }

  const updatedUser = await User.findByIdAndUpdate(userId, update, {
    new: true
  }).select('paypalId stripeId');

  res.status(200).json({
    success: true,
    message: 'Withdrawal method deleted successfully.',
    data: updatedUser
  });
});
