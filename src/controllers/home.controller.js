const { asyncHandler } = require('../utils/asyncHandler.js');
const mongoose = require('mongoose');
const User = require('../models/user.model.js');
const Album = require('../models/album.model.js');
const Song = require('../models/song.model.js');
const Hero = require('../models/hero.model.js');
const { uploadFile } = require('../services/cloudinary.js');

module.exports.searchAll = asyncHandler(async (req, res) => {
  try {
    const query = req.query.query?.trim(); // Trim any whitespace
    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    // Use regex for case-insensitive search
    const regex = { $regex: query, $options: 'i' };

    // 1. Search Artists
    const artistsPromise = User.aggregate([
      { $match: { role: 'artist', fullName: regex } },
      {
        $lookup: {
          from: 'songs',
          localField: '_id',
          foreignField: 'artist',
          as: 'songs'
        }
      },
      {
        $lookup: {
          from: 'albums',
          localField: '_id',
          foreignField: 'artist',
          as: 'albums'
        }
      },
      {
        $project: {
          _id: 1,
          fullName: 1,
          email: 1,
          coverImage: 1,
          songs: {
            _id: 1,
            title: 1,
            coverImage: 1,
            duration: 1,
            audioUrls: 1,
            artist: '$artistInfo.fullName'
          },
          albums: {
            _id: 1,
            title: 1,
            coverImage: 1,
            releaseDate: 1
          }
        }
      }
    ]);

    // 2. Search Albums
    const albumsPromise = Album.aggregate([
      { $match: { title: regex } },
      {
        $lookup: {
          from: 'users',
          localField: 'artist',
          foreignField: '_id',
          as: 'artistInfo'
        }
      },
      { $unwind: '$artistInfo' },
      {
        $lookup: {
          from: 'songs',
          localField: '_id',
          foreignField: 'album',
          as: 'songs'
        }
      },
      {
        $project: {
          _id: 1,
          title: 1,
          coverImage: 1,
          releaseDate: 1,
          artistInfo: {
            _id: 1,
            fullName: 1,
            coverImage: 1
          },
          songs: {
            _id: 1,
            title: 1,
            duration: 1,
            coverImage: 1,
            audioUrls: 1,
            artist: '$artistInfo.fullName'
          }
        }
      }
    ]);

    // 3. Search Songs
    const songsPromise = Song.aggregate([
      { $match: { title: regex } },
      {
        $lookup: {
          from: 'users',
          localField: 'artist',
          foreignField: '_id',
          as: 'artistInfo'
        }
      },
      { $unwind: '$artistInfo' },
      {
        $lookup: {
          from: 'albums',
          localField: 'album',
          foreignField: '_id',
          as: 'albumInfo'
        }
      },
      { $unwind: { path: '$albumInfo', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          title: 1,
          duration: 1,
          coverImage: 1,
          audioUrls: 1,
          plays: 1,
          price: 1,
          freeDownload: 1,
          artist: '$artistInfo.fullName',

          audioUrls: 1,
          artistInfo: {
            _id: 1,
            fullName: 1,
            coverImage: 1
          },
          albumInfo: {
            _id: 1,
            title: 1,
            coverImage: 1,
            releaseDate: 1
          }
        }
      }
    ]);

    // Execute all queries in parallel
    const [artists, albums, songs] = await Promise.all([
      artistsPromise,
      albumsPromise,
      songsPromise
    ]);

    // Handle no results found
    if (artists.length === 0 && albums.length === 0 && songs.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No results found for "${query}"`,
        data: { artists: [], albums: [], songs: [] }
      });
    }

    // Return search results
    res.status(200).json({
      success: true,
      message: `Search results retrieved successfully.`,
      data: { artists, albums, songs }
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while searching. Please try again later.',
      error: error.message
    });
  }
});

module.exports.getHeroSection = asyncHandler(async (req, res) => {
  try {
    const data = await Hero.findById("6810713b0d930c8c24b1ccd2");

    if (!data || data.length === 0) {
      return res.status(404).json({ message: 'No data found', success: false });
    }

    return res
      .status(200)
      .json({ message: 'success', success: true, data: data });
  } catch (error) {
    return res.status(500).json({
      message: error.message || 'Failed to fetch hero section data',
      success: false
    });
  }
});
module.exports.updateHeroSection = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const data = req.body;
  const file = req.file;

  if (!id) {
    return res.status(400).json({ message: 'No id provided', success: false });
  }

  try {
    // Handle coverImage upload if present
    if (file) {
      const filePath = file.path;
      try {
        const uploadedImage = await uploadFile(filePath); // Upload to Cloudinary
        data.coverImage = uploadedImage?.secure_url || ''; // Set in request body for update
      } catch (err) {
        return res.status(500).json({
          message: 'Error uploading cover image',
          success: false,
          error: err.message,
        });
      }
    }

    const updatedHero = await Hero.findByIdAndUpdate(
      id,
      data,
      { new: true, runValidators: true }
    );

    if (!updatedHero) {
      return res
        .status(404)
        .json({ message: 'Hero section not found', success: false });
    }

    res.status(200).json({
      message: 'Hero section updated successfully',
      success: true,
      data: updatedHero,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || 'Failed to update hero section',
      success: false,
    });
  }
});
