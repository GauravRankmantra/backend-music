const User = require('../models/user.model.js');
const Song = require('../models/song.model.js');
const Genre = require('../models/genre.model.js');
const { asyncHandler } = require('../utils/asyncHandler');
const mongoose = require('mongoose');


// utils/formatDuration.js
const formatDuration = (duration) => {
  if (duration < 10) {
    const minutes = Math.floor(duration);
    const seconds = Math.round((duration - minutes) * 60);
    return `${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  } else {
    // Assume duration is in seconds.
    const totalSeconds = Math.round(duration);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  }
};



module.exports.getDashbordInfo = asyncHandler(async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId)
      .lean()
      .select('-password -otp -__v -refreshToken')
      .populate('purchasedSongs', 'title coverImage audioUrls duration artist album genre')
      .populate('favArtist', 'fullName coverImage')
      .populate('topGenre.genre', 'name image')
      .populate('songsHistory', 'title coverImage  audioUrls duration')
      .populate('allTimeSong.song', 'title audioUrls artist coverImage duration')
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
    const purchasedSongs = (user.purchasedSongs || []).slice(0, 4).map(song => ({
      ...song,
      duration: formatDuration(song.duration)
    }));
    
    // Format songsHistory
    const songsHistory = (user.songsHistory || []).slice(0, 4).map(song => ({
      ...song,
      duration: formatDuration(song.duration)
    }));

    // Sort allTimeSong by plays descending and take top 4
    const enrichedAllTimeSongs = (user.allTimeSong || [])
    .filter(entry => entry.song)
    .sort((a, b) => b.plays - a.plays)
    .slice(0, 4)
    .map(entry => ({
      ...entry.song,
      duration: formatDuration(entry.song.duration),
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
      activityStats: user.activityStats || [],
      songsThisMonth: user.songsThisMonth || [],
      purchasedSongs,
      songsHistory,
      allTimeSong: enrichedAllTimeSongs,
      topGenre: (user.topGenre || []).filter(g => g.genre !== null),
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


module.exports.addActivity = asyncHandler(async (req, res) => {
  const { userId, minutesSpent } = req.body;
  console.log(userId, minutesSpent);
  if (!userId || !minutesSpent) {
    return res.status(400).json({ message: 'Missing userId or minutesSpent' });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Check if an entry for today exists
    const existingStat = user.activityStats.find(
      (stat) => new Date(stat.date).toDateString() === today.toDateString()
    );

    if (existingStat) {
      existingStat.minutesSpent += minutesSpent;
    } else {
      user.activityStats.push({ date: today, minutesSpent });
    }

    await user.save();
    res.status(200).json({ message: 'Activity logged' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});
