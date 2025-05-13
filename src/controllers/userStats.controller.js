const { asyncHandler } = require('../utils/asyncHandler.js');
const UserStats = require('../models/userStats.model.js');
const mongoose = require('mongoose');
const Song = require('../models/song.model.js');




const getDateRange = (filter) => {
  const today = new Date();
  let startDate, endDate;

  switch (filter) {
    case 'weekly':
      // Set startDate to 6 days before today
      startDate = new Date(today);
      startDate.setDate(today.getDate() - 6);
      break;
    case 'monthly':
      // Set startDate to the first day of the current month
      startDate = new Date(today.getFullYear(), today.getMonth(), 1);
      break;
    case 'all':
    default:
      // Set startDate to a date far in the past
      startDate = new Date(0);
      break;
  }

  // Set endDate to the end of today
  endDate = new Date(today);
  endDate.setHours(23, 59, 59, 999);

  return { startDate, endDate };
};




module.exports.getUserStats = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = new mongoose.Types.ObjectId(id);
  const { filter = 'weekly' } = req.query;

  if (!id) {
    return res.status(400).json({ success: false, message: 'No user id provided' });
  }

  const now = new Date();
  let startDate;

  switch (filter) {
    case 'weekly':
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 6); // Last 7 days including today
      break;
    case 'monthly':
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 29); // Last 30 days including today
      break;
    case 'all':
      startDate = null; // No date filter
      break;
    default:
      return res.status(400).json({ success: false, message: 'Invalid filter value' });
  }

  try {
    const matchStage = { user: userId };
    if (startDate) {
      matchStage.date = { $gte: startDate, $lte: now };
    }

    const stats = await UserStats.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' },
            day: { $dayOfMonth: '$date' },
          },
          downloads: { $sum: '$downloads' },
          purchases: { $sum: '$purchases' },
          revenue: { $sum: '$revenue' },
        },
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 },
      },
    ]);

    if (!stats || stats.length === 0) {
      return res.status(404).json({ success: false, data: [], message: 'No data available for this user' });
    }

    return res.status(200).json({ success: true, message: 'success', data: stats });
  } catch (error) {
    console.error('Error fetching user stats:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch user stats' });
  }
});


module.exports.addDownloadStats = asyncHandler(async (req, res) => {
  const { songId, artistIds } = req.body; // Expecting artistIds as an array

  if (!Array.isArray(artistIds) || artistIds.length === 0) {
    res.status(400).json({ message: 'Artist IDs are required as an array' });
    return;
  }

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to the beginning of the day

    const updatePromises = artistIds.map(async (artistId) => {
      if (!mongoose.Types.ObjectId.isValid(artistId)) {
        console.warn(`Invalid artist ID encountered: ${artistId}`);
        return null; // Skip invalid IDs
      }

      // Find if a stats document already exists for the artist for today's date
      const existingStats = await UserStats.findOne({
        user: artistId,
        date: today
      });

      if (existingStats) {
        // If stats exist for today, increment the downloads count
        existingStats.downloads += 1;
        await existingStats.save();
        return { artistId, status: 'incremented' };
      } else {
        // If no stats exist for today, create a new stats document
        const newUserStats = await UserStats.create({
          user: artistId,
          downloads: 1,
          date: today
        });
        return { artistId, status: 'created', data: newUserStats };
      }
    });

    const results = await Promise.all(updatePromises);
    const successfulUpdates = results.filter((result) => result !== null);

    res.status(200).json({
      message: 'Download stats processed successfully',
      results: successfulUpdates
    });
  } catch (error) {
    console.error('Error adding download stats for multiple artists:', error);
    res.status(500).json({
      message: 'Failed to add download stats for multiple artists',
      error: error.message
    });
  }
});

module.exports.addPurchaseStats = asyncHandler(async (req, res) => {
  const { artistIds } = req.body; // Expecting artistIds as an array

  if (!Array.isArray(artistIds) || artistIds.length === 0) {
    res.status(400).json({ message: 'Artist IDs are required as an array' });
    return;
  }

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to the beginning of the day

    const updatePromises = artistIds.map(async (artistId) => {
      if (!mongoose.Types.ObjectId.isValid(artistId)) {
        console.warn(`Invalid artist ID encountered: ${artistId}`);
        return null;
      }

      const existingStats = await UserStats.findOne({
        user: artistId,
        date: today
      });

      if (existingStats) {
        // If stats exist for today, increment the downloads count
        existingStats.purchases += 1;
        await existingStats.save();
        return { artistId, status: 'incremented' };
      } else {
        // If no stats exist for today, create a new stats document
        const newUserStats = await UserStats.create({
          user: artistId,
          purchases: 1,
          date: today
        });
        return { artistId, status: 'created', data: newUserStats };
      }
    });

    const results = await Promise.all(updatePromises);
    const successfulUpdates = results.filter((result) => result !== null);

    res.status(200).json({
      message: 'Purchase stats processed successfully',
      results: successfulUpdates
    });
  } catch (error) {
    console.error('Error adding Purchase stats for multiple artists:', error);
    res.status(500).json({
      message: 'Failed to add purchase stats for multiple artists',
      error: error.message
    });
  }
});

module.exports.addRevenueStats = asyncHandler(async (req, res) => {
  const { price, artistIds } = req.body; // Expecting artistIds as an array

  if (!Array.isArray(artistIds) || artistIds.length === 0) {
    res.status(400).json({ message: 'Artist IDs are required as an array' });
    return;
  }

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to the beginning of the day

    const updatePromises = artistIds.map(async (artistId) => {
      if (!mongoose.Types.ObjectId.isValid(artistId)) {
        console.warn(`Invalid artist ID encountered: ${artistId}`);
        return null;
      }

      const existingStats = await UserStats.findOne({
        user: artistId,
        date: today
      });

      if (existingStats) {
        // If stats exist for today, increment the downloads count
        existingStats.revenue += price;
        await existingStats.save();
        return { artistId, status: 'incremented' };
      } else {
        // If no stats exist for today, create a new stats document
        const newUserStats = await UserStats.create({
          user: artistId,
          revenue: song.price,
          date: today
        });
        return { artistId, status: 'created', data: newUserStats };
      }
    });

    const results = await Promise.all(updatePromises);
    const successfulUpdates = results.filter((result) => result !== null);

    res.status(200).json({
      message: 'Purchase stats processed successfully',
      results: successfulUpdates
    });
  } catch (error) {
    console.error('Error adding Purchase stats for multiple artists:', error);
    res.status(500).json({
      message: 'Failed to add purchase stats for multiple artists',
      error: error.message
    });
  }
});
