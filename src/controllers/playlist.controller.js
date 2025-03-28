const Playlist = require('../models/playlist.model.js'); // Assuming the Playlist model is located in the models folder
const Song = require('../models/song.model.js');
const User = require('../models/user.model.js');
const { asyncHandler } = require('../utils/asyncHandler.js');
const { uploadFile } = require('../services/cloudinary.js');

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
  const playlistsWithTotalSongs = playlists.map(playlist => ({
    ...playlist.toObject(),
    totalSongs: playlist.songs.length,
  }));

  res.status(200).json({
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
  const { name, description, owner, songs } = req.body;

  const file = req.file;

  let coverImageUrl = '';

  if (file) {
    const coverImagePath = file.path; // Get the cover image path from Multer
    try {
      const coverImageFile = await uploadFile(coverImagePath); // Upload to Cloudinary
      coverImageUrl = coverImageFile ? coverImageFile.secure_url : ''; // Get Cloudinary URL
    } catch (error) {
      return res
        .status(500)
        .json({ message: 'Error uploading cover image', error });
    }
  }

  const playlistExists = await Playlist.findOne({ name });
  if (playlistExists) {
    return res
      .status(400)
      .json({ message: 'Playlist with this name already exists' });
  }
  const coverImage = coverImageUrl;

  const playlist = await Playlist.create({
    name,
    description,
    owner,
    songs,
    coverImage
  });

  res.status(201).json({
    success: true,
    data: playlist
  });
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

  const playlist = await Playlist.findById(playlistId);
  if (!playlist) {
    return res.status(404).json({ message: 'Playlist not found' });
  }

  await playlist.remove();

  res.status(200).json({
    success: true,
    message: 'Playlist deleted successfully'
  });
});
