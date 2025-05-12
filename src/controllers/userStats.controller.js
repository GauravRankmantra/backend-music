const { asyncHandler } = require('../utils/asyncHandler.js');
const UserStats = require('../models/userStats.model.js');
const mongoose = require('mongoose');
const Song = require('../models/song.model.js');

module.exports.getUserStats = asyncHandler(async (req, res) => {
  const id = req.params;
  if (!id)
    return res
      .status(400)
      .json({ success: false, message: 'No user id provided' });
  const download = UserStats.find({ user: id });

  if (!download)
    return res
      .status(400)
      .json({ success: false, data: [], message: 'No data avaliable ' });

  return res
    .status(200)
    .json({ success: true, message: 'success', data: download });
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
  const { songId, artistIds } = req.body; // Expecting artistIds as an array

  if (!Array.isArray(artistIds) || artistIds.length === 0) {
    res.status(400).json({ message: 'Artist IDs are required as an array' });
    return;
  }
  if (!songId) return res.status(400).json({ message: 'Song Id is required' });

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to the beginning of the day

    const song = await Song.findById(songId);
    if (!song)
      return res.status(404).json({ message: 'No song found with this id ' });

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
        existingStats.revenue += song.price;
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
