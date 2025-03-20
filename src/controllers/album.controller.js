const Album = require('../models/album.model.js');
const Song = require('../models/song.model.js');
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;
const Comment = require('../models/comment.model.js');
const { asyncHandler } = require('../utils/asyncHandler.js');
const { uploadFile } = require('../services/cloudinary.js');

module.exports.getFeaturedAlbums = asyncHandler(async (req, res) => {
  try {
    const featuredAlbums = await Album.aggregate([
      {
        $lookup: {
          from: 'users',
          localField: 'artist',
          foreignField: '_id',
          as: 'artist'
        }
      },

      {
        $lookup: {
          from: 'songs',
          localField: 'songs',
          foreignField: '_id',
          as: 'songs'
        }
      },

      {
        $unwind: '$artist'
      }
    ]);

    res.status(200).json({
      success: true,
      message: 'Featured album retrieved successfully.',
      data: featuredAlbums
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: 'Error while fetching the albums', error });
  }
});
module.exports.getTrendingAlbums = asyncHandler(async (req, res) => {
  try {
    const featuredAlbums = await Album.aggregate([
      {
        $match: { isTranding: true }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'artist',
          foreignField: '_id',
          as: 'artist'
        }
      },

      {
        $lookup: {
          from: 'songs',
          localField: 'songs',
          foreignField: '_id',
          as: 'songs'
        }
      },

      {
        $unwind: '$artist'
      }
    ]);

    res.status(200).json({
      success: true,
      message: 'Featured album retrieved successfully.',
      data: featuredAlbums
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: 'Error while fetching the albums', error });
  }
});

module.exports.getAlbumDetail = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const albumId = new mongoose.Types.ObjectId(id.trim());

  try {
    const detail = await Album.aggregate([
      // Step 1: Match the album by its ID
      { $match: { _id: albumId } },

      // Step 2: Populate artist and genre
      {
        $lookup: {
          from: 'users',
          localField: 'artist',
          foreignField: '_id',
          as: 'artistDetails'
        }
      },
      {
        $lookup: {
          from: 'genres',
          localField: 'genre',
          foreignField: '_id',
          as: 'genreDetails'
        }
      },

      // Step 3: Join with songs collection to get album's songs
      {
        $lookup: {
          from: 'songs',
          localField: '_id', // album's _id
          foreignField: 'album', // matching songs where 'album' is the same as album _id
          as: 'songs'
        }
      },

      // Step 4: Join with comments collection to get album's comments
      {
        $lookup: {
          from: 'comments',
          localField: '_id', // album's _id
          foreignField: 'album', // matching comments where 'album' is the same as album _id
          as: 'comments'
        }
      },

      // Step 5: Add new fields (totalSongs and totalDuration)
      {
        $addFields: {
          totalSongs: { $size: '$songs' }, // Counting number of songs
          totalDuration: {
            $sum: '$songs.duration' // Summing up duration of all songs
          }
        }
      },

      // Step 6: Unwind artist and genre (since they are in arrays after $lookup)
      { $unwind: '$artistDetails' },
      { $unwind: '$genreDetails' },

      // Step 7: Select only the fields we need
      {
        $project: {
          _id: 1,
          title: 1,
          company: 1,
          releaseDate: 1,
          coverImage: 1,
          artistDetails: 1,
          genreDetails: 1,
          songs: 1,
          comments: 1,
          totalSongs: 1,
          totalDuration: 1
        }
      }
    ]);

    // Check if album is found

    if (!detail || detail.length === 0) {
      return res.status(200).json({ message: 'No Album found' });
    }

    // Return the album details (first item in the array)
    return res.status(200).json({ success: true, data: detail[0] });
  } catch (error) {
    return res.status(500).json({ message: 'failed', error });
  }
});

module.exports.getTop15 = asyncHandler(async (req, res) => {
  try {
    const top15 = await Album.aggregate([
      // Step 1: Lookup to join with the songs collection
      {
        $lookup: {
          from: 'songs',
          localField: 'songs',
          foreignField: '_id',
          as: 'albumSongs'
        }
      },
      // Step 2: Unwind the albumSongs array
      { $unwind: '$albumSongs' },

      // Step 3: Group by album and sum the total plays for all its songs
      {
        $group: {
          _id: '$_id',
          title: { $first: '$title' },
          artist: { $first: '$artist' },
          coverImage: { $first: '$coverImage' },
          totalPlays: { $sum: '$albumSongs.plays' } // Sum the plays for each song in the album
        }
      },

      { $sort: { totalPlays: -1 } },

      // Step 5: Limit the results to the top 15 albums
      { $limit: 15 }
    ]);

    // Send the top 15 albums as the response
    res.status(200).json({
      success: true,
      data: top15
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});
module.exports.getAllAlbums = asyncHandler(async (req, res) => {
  try {
    const allAlbums = await Album.aggregate([
      {
        $lookup: {
          from: 'users',
          localField: 'artist',
          foreignField: '_id',
          as: 'artist'
        }
      },

      {
        $lookup: {
          from: 'songs',
          localField: 'songs',
          foreignField: '_id',
          as: 'songs'
        }
      },

      {
        $unwind: '$artist'
      }
    ]);

    if (!allAlbums || allAlbums.length === 0) {
      return res
        .status(404)
        .json({ success: 'false', message: 'No albums found' });
    }

    return res.status(200).json({ success: 'true', allAlbums });
  } catch (error) {
    console.error('Error fetching albums:', error);
    return res
      .status(500)
      .json({ success: 'false', message: 'Internal server error' });
  }
});

module.exports.addComment = asyncHandler(async (req, res) => {
  const { comment, userId, albumId } = req.body;

  if (!comment || !userId || !albumId)
    return res
      .status(400)
      .json({ message: 'Comment, userId, albumId required' });
  const commentInfo = await Comment.create({
    user: userId,
    comment,
    album: albumId
  });
  if (!commentInfo)
    return res.status(500).json({ message: 'comment creation failed ' });
  return res.status(200).json({ message: 'Commented.' });
});

module.exports.addAlbums = asyncHandler(async (req, res) => {
  const { title, artist, genre, company } = req.body;
  if (!title || !artist || !genre || !company)
    return res
      .status(400)
      .json({ success: false, message: 'All fields are require ' });
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

  try {
    // Create a new album
    const coverImage = coverImageUrl;
    // const validSongs = Array.isArray(songs)
    //   ? songs.map((id) => new mongoose.Types.ObjectId(id.trim()))
    //   : songs
    //     ? songs.split(',').map((id) => new mongoose.Types.ObjectId(id.trim()))
    //     : [];

    const album = new Album({
      title,
      artist,
      coverImage,
      genre,
      company,
      releaseDate: Date.now()
    });

    // Save the album to the database
    const savedAlbum = await album.save();

    res.status(201).json(savedAlbum);
  } catch (error) {
    res.status(500).json({ message: 'Error creating album', error });
  }
});

module.exports.updateAlbum = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const {
    title,
    company,
    genre,
    isPublished,
    isFeatured,
    isTranding,
    songs,
    removeSongs
  } = req.body;
  const file = req.file;

  let coverImageUrl = '';

  if (file) {
    const coverImagePath = file.path;
    try {
      const coverImageFile = await uploadFile(coverImagePath);
      coverImageUrl = coverImageFile ? coverImageFile.secure_url : '';
    } catch (error) {
      console.error('Error uploading cover image:', error);
      return res
        .status(500)
        .json({ message: 'Error uploading cover image', error });
    }
  }
  try {
    let album = await Album.findById(id);
    if (!album) {
      return res.status(404).json({
        success: false,
        message: 'Album not found'
      });
    }

    if (title && title != '') album.title = title;
    if (company && company != '') album.company = company;
    if (file && coverImageUrl != '') album.coverImage = coverImageUrl;
    if (genre && genre != '') album.genre = genre;
    if (typeof isPublished !== 'undefined') album.isPublished = isPublished;
    if (typeof isFeatured !== 'undefined') album.isFeatured = isFeatured;
    if (typeof isTranding !== 'undefined') album.isTranding = isTranding;
    let songIds = [];

    if (typeof songs === 'string') {
      try {
        songIds = JSON.parse(songs);
      } catch (error) {
        return res
          .status(400)
          .json({ success: false, message: 'Invalid songs format' });
      }
    } else if (Array.isArray(songs)) {
      songIds = songs;
    } else {
      return res
        .status(400)
        .json({ success: false, message: 'Invalid songs format' });
    }

    if (!Array.isArray(songIds) || songIds.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: 'No valid songs provided' });
    }

    const songObjectIds = songIds.map((songId) => new ObjectId(songId));

    await Song.updateMany(
      { _id: { $in: songObjectIds } },
      { $set: { album: id } }
    );
    album.songs.push(...songObjectIds);

    if (removeSongs && removeSongs.length > 0) {
      const removeSongsObjectIds = songs.map((songId) => new ObjectId(songId));
      await Song.updateMany(
        { _id: { $in: removeSongsObjectIds } },
        { $unset: { album: '' } }
      );

      album.songs = album.songs.filter(
        (songId) => !removeSongs.includes(songId)
      );
    }

    await album.save();

    res.status(200).json({
      success: true,
      message: 'Album updated successfully',
      album
    });
  } catch (error) {
    console.error('Error updating album:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports.deleteAlbum = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!id)
    return res.status(404).json({ success: false, message: 'No id provided' });
  const album = await Album.findByIdAndDelete(id);
  if (!album)
    return res
      .status(500)
      .json({ success: false, message: 'Album deletion failed ' });
  return res
    .status(200)
    .json({ success: true, message: 'Album deleted Successfully' });
});

module.exports.getArtistAlbums = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!id)
    return res
      .status(404)
      .json({ success: false, message: 'No artist id provided' });
  const album = await Album.aggregate([
    { $match: { _id: id } },
    {
      $lookup: {
        from: 'users',
        localField: 'artist',
        foreignField: '_id',
        as: 'Artist'
      }
    },
    {
      $lookup: {
        from: 'songs',
        localField: 'song',
        foreignField: '_id',
        as: 'Songs'
      }
    },
    {}
  ]);
});

module.exports.getAlbumSearch = asyncHandler(async (req, res) => {
  const { search = '' } = req.query; // Get the search query from the frontend (default to an empty string)

  // Use a case-insensitive regex to match artist names that contain the search query
  const allAlbums = await Album.find({
    title: { $regex: search, $options: 'i' } // Case-insensitive match
  });

  if (!allAlbums.length)
    return res.status(404).json({ success: false, message: 'No Album Found' });

  return res.status(200).json({ success: true, data: allAlbums });
});
