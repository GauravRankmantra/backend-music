const User = require('../models/user.model.js');
const Song = require('../models/song.model.js');
const Genre = require('../models/genre.model.js');
const Sale = require('../models/sales.model.js');
const { asyncHandler } = require('../utils/asyncHandler');
const mongoose = require('mongoose');

// utils/formatDuration.js
const formatDuration = (duration) => {
  if (duration < 10) {
    const minutes = Math.floor(duration);
    const seconds = Math.round((duration - minutes) * 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds
      .toString()
      .padStart(2, '0')}`;
  } else {
    // Assume duration is in seconds.
    const totalSeconds = Math.round(duration);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds
      .toString()
      .padStart(2, '0')}`;
  }
};

module.exports.getDashbordInfo = asyncHandler(async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId)
      .lean()
      .select('-password -otp -__v -refreshToken')
      .populate(
        'purchasedSongs',
        'title coverImage audioUrls duration artist album genre'
      )
      .populate('favArtist', 'fullName coverImage')
      .populate('songsHistory', 'title coverImage  audioUrls duration')
      .populate({
        path: 'topGenre.genre',
        model: 'Genre',
        select: 'name image'
      })

      .populate(
        'allTimeSong.song',
        'title audioUrls artist coverImage duration'
      )
      .populate({
        path: 'allTimeSong.song',
        populate: {
          path: 'artist',
          select: 'fullName _id'
        }
      });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Slice purchasedSongs and songsHistory
    const purchasedSongs = (user.purchasedSongs || [])
      .slice(0, 4)
      .map((song) => ({
        ...song,
        duration: song.duration
      }));

    // Format songsHistory
    const songsHistory = (user.songsHistory || []).slice(0, 4).map((song) => ({
      ...song,
      duration: song.duration
    }));

    // Sort allTimeSong by plays descending and take top 4
    const enrichedAllTimeSongs = (user.allTimeSong || [])
      .filter((entry) => entry.song)
      .sort((a, b) => b.plays - a.plays)
      .slice(0, 4)
      .map((entry) => ({
        ...entry.song,
        duration: entry.song.duration,
        plays: entry.plays,
        date: entry.date
      }));

    const dashboardData = {
      _id: user._id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      isFeatured: user.isFeatured,
      avatar: user.avatar,
      coverImage: user.coverImage,
      bio: user.bio,
      profileColor: user.profileColor,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      paymentDate: user.paymentDate,
      uploadedSongsThisMonth: user.uploadedSongsThisMonth,
      downloadedSongsThisMonth: user.downloadedSongsThisMonth,
      songsThisMonth: user.songsThisMonth || [],
      purchasedSongs,
      songsHistory,
      allTimeSong: enrichedAllTimeSongs,
      topGenre: user.topGenre,
      favArtist: user.favArtist || [],
      socialLinks: {
        facebook: user.facebook,
        instagram: user.instagram,
        twitter: user.twitter
      }
    };

    res.status(200).json({ success: true, data: dashboardData });
  } catch (error) {
    console.error('Error in getDashbordInfo:', error);
    res.status(500).json({
      success: false,
      message: 'Internal Server Error',
      error: error.message
    });
  }
});

module.exports.getWeeklyActivityStats = asyncHandler(async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId)
      .select('activityStats')
      .lean();

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: 'User not found' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const fiveDaysAgo = new Date(today);
    fiveDaysAgo.setDate(today.getDate() - 4);

    const rawStats = user.activityStats || [];
    const sumsByDate = rawStats.reduce((acc, { date, minutesSpent }) => {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      const key = d.toISOString();
      acc[key] = (acc[key] || 0) + minutesSpent;
      return acc;
    }, {});

    const weeklyStats = Array.from({ length: 5 }).map((_, i) => {
      const d = new Date(fiveDaysAgo);
      d.setDate(d.getDate() + i);
      const key = d.toISOString();
      return {
        date: key,
        minutesSpent: sumsByDate[key] || 0,
      };
    });

    res.status(200).json({
      success: true,
      data: weeklyStats,
    });
  } catch (error) {
    console.error('Error in getWeeklyActivityStats:', error);
    res.status(500).json({
      success: false,
      message: 'Internal Server Error',
      error: error.message,
    });
  }
});

module.exports.addActivity = asyncHandler(async (req, res) => {
  const { userId, minutesSpent } = req.body;
  if (!userId || !minutesSpent) {
    return res.status(400).json({ message: 'Missing userId or minutesSpent' });
  }

  const today = new Date().toDateString();

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const existingStat = user.activityStats.find(
      (stat) => new Date(stat.date).toDateString() === today
    );

    const midnight = new Date();
    midnight.setHours(0, 0, 0, 0);

    if (existingStat) {
      existingStat.minutesSpent += minutesSpent;
    } else {
      user.activityStats.push({ date: midnight, minutesSpent });
    }

    await user.save();
    res.status(200).json({ message: 'Activity logged' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports.getSellerPurchaseStats = asyncHandler(async (req, res) => {
  const { sellerId } = req.params; // Pass sellerId in route params

  if (!mongoose.Types.ObjectId.isValid(sellerId)) {
    return res
      .status(400)
      .json({ success: false, message: 'Invalid seller ID' });
  }

  const stats = await Sale.aggregate([
    {
      $match: {
        sellerId: new mongoose.Types.ObjectId(sellerId)
      }
    },
    {
      $lookup: {
        from: 'songs',
        localField: 'songId',
        foreignField: '_id',
        as: 'song'
      }
    },
    {
      $unwind: '$song'
    },
    {
      $group: {
        _id: '$songId',
        songTitle: { $first: '$song.title' },
        coverImage: { $first: '$song.coverImage' },
        totalSales: { $sum: 1 },
        totalEarnings: { $sum: '$sellerEarning' }
      }
    },
    {
      $group: {
        _id: null,
        songs: {
          $push: {
            songId: '$_id',
            songTitle: '$songTitle',
            coverImage: '$coverImage',
            totalSales: '$totalSales',
            totalEarnings: '$totalEarnings'
          }
        },
        totalSellerEarnings: { $sum: '$totalEarnings' },
        totalSongsSold: { $sum: '$totalSales' }
      }
    },
    {
      $project: {
        _id: 0,
        totalSellerEarnings: 1,
        totalSongsSold: 1,
        songs: 1
      }
    }
  ]);

  res.status(200).json({
    success: true,
    data:
      stats.length > 0
        ? stats[0]
        : {
            totalSellerEarnings: 0,
            totalSongsSold: 0,
            songs: []
          }
  });
});
