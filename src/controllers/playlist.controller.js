const Playlist = require('../models/playlist.model.js'); // Assuming the Playlist model is located in the models folder
const Song = require('../models/song.model.js');
const User = require('../models/user.model.js');
const { asyncHandler } = require('../utils/asyncHandler.js');
const { uploadFile } = require('../services/cloudinary.js');
const mongoose = require("mongoose")

// Get Playlist by ID with song details
module.exports.getPlaylistById = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;

  // Find the playlist and populate song details
  const playlist = await Playlist.findById(playlistId)
    .populate({
      path: 'songs',
      model: 'Song',
      populate: {
        path: 'artist album',
        select: 'fullName title'
      }
    })
    .populate('owner', 'fullName');

  if (!playlist) {
    return res.status(404).json({ message: 'Playlist not found' });
  }

  res.status(200).json({
    success: true,
    data: playlist
  });
});
module.exports.getPlaylistByUserId = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  if (!userId)
    return res
      .status(401)
      .json({ success: false, message: ' You Need to login ' });

  // Find playlists by the owner's ID
  const playlists = await Playlist.find({ owner: userId })
    .populate({
      path: 'songs',
      model: 'Song',
      populate: {
        path: 'artist album',
        select: 'fullName title'
      }
    })
    .populate('owner', 'fullName');

  if (!playlists || playlists.length === 0) {
    return res
      .status(404)
      .json({ message: 'No playlists found for this user' });
  }
  const playlistsWithTotalSongs = playlists.map((playlist) => ({
    ...playlist.toObject(),
    totalSongs: playlist.songs.length
  }));

  res.status(201).json({
    success: true,
    data: playlistsWithTotalSongs
  });
});

// Get Playlists by User's fullName
module.exports.getPlaylistByUserName = asyncHandler(async (req, res) => {
  const { userName } = req.params;

  const user = await User.findOne({ fullName: new RegExp(userName, 'i') }); // Case-insensitive search

  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  // Then, find playlists by the owner's ID (user._id)
  const playlists = await Playlist.find({ owner: user._id })
    .populate({
      path: 'songs',
      model: 'Song',
      populate: {
        path: 'artist album',
        select: 'fullName title'
      }
    })
    .populate('owner', 'fullName');

  if (!playlists || playlists.length === 0) {
    return res
      .status(404)
      .json({ message: 'No playlists found for this user' });
  }

  res.status(200).json({
    success: true,
    data: playlists
  });
});

module.exports.getPlaylists = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;

  const aggregateQuery = Playlist.aggregate([
    {
      $lookup: {
        from: 'songs',
        localField: 'songs',
        foreignField: '_id',
        as: 'songDetails'
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: 'owner',
        foreignField: '_id',
        as: 'ownerDetails'
      }
    }
  ]);

  const options = {
    page,
    limit,
    sort: { createdAt: -1 }
  };

  const playlists = await Playlist.aggregatePaginate(aggregateQuery, options);

  res.status(200).json({
    success: true,
    data: playlists
  });
});

module.exports.createPlaylist = asyncHandler(async (req, res) => {
  let { name, description, songs } = req.body;
  const owner = req.user._id;
  const file = req.file;

  let coverImageUrl = '';

  // Handle Cover Image Upload
  if (file) {
    const coverImagePath = file.path;
    try {
      const coverImageFile = await uploadFile(coverImagePath);
      coverImageUrl = coverImageFile ? coverImageFile.secure_url : '';
    } catch (error) {
      return res.status(500).json({ message: 'Error uploading cover image', error });
    }
  }

  // Parse songs if it's a string
  if (typeof songs === 'string') {
    try {
      songs = JSON.parse(songs);
    } catch (error) {
      return res.status(400).json({ message: 'Invalid songs format' });
    }
  }

  // Validate description length
  if (description.length > 50) {
    return res.status(400).json({ message: "Description must be at most 50 characters long." });
  }

  // Ensure songs are ObjectIds
  if (!Array.isArray(songs) || !songs.every(songId => mongoose.Types.ObjectId.isValid(songId))) {
    return res.status(400).json({ message: 'Invalid song IDs' });
  }

  // Check if playlist already exists
  const playlistExists = await Playlist.findOne({ name });
  if (playlistExists) {
    return res.status(400).json({ message: 'Playlist with this name already exists' });
  }

  const playlist = await Playlist.create({
    name,
    description,
    owner,
    songs,
    coverImage: coverImageUrl
  });

  res.status(201).json({
    success: true,
    data: playlist
  });
});

module.exports.addSongToPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, songId } = req.body;

  if (!playlistId || !songId) {
    return res
      .status(400)
      .json({ message: 'Playlist ID and Song ID are required' });
  }

  try {
    const playlist = await Playlist.findById(playlistId);
    const song = await Song.findById(songId);

    if (!playlist) {
      return res.status(404).json({ message: 'Playlist not found' });
    }

    if (!song) {
      return res.status(404).json({ message: 'Song not found' });
    }

    // Check if the song is already in the playlist
    if (playlist.songs.includes(songId)) {
      return res
        .status(400)
        .json({ message: 'Song already exists in the playlist' });
    }

    // Add the song to the playlist
    playlist.songs.push(songId);
    await playlist.save();

    res.status(200).json({
      success: true,
      message: 'Song added to playlist successfully',
      data: playlist
    });
  } catch (error) {
    console.error('Error adding song to playlist:', error);
    res
      .status(500)
      .json({ message: 'Internal server error', error: error.message });
  }
});
module.exports.updatePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  const { name, description, songs } = req.body;

  let playlist = await Playlist.findById(playlistId);
  if (!playlist) {
    return res.status(404).json({ message: 'Playlist not found' });
  }

  playlist.name = name || playlist.name;
  playlist.description = description || playlist.description;
  playlist.songs = songs || playlist.songs;

  await playlist.save();

  res.status(200).json({
    success: true,
    data: playlist
  });
});

module.exports.deletePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;

  try {
    const deletedPlaylist = await Playlist.findByIdAndDelete(playlistId);

    if (!deletedPlaylist) {
      return res.status(404).json({ message: 'Playlist not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Playlist deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting playlist:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});
