const { asyncHandler} = require("../utils/asyncHandler.js");
const mongoose = require("mongoose");
const User = require("../models/user.model.js");
const Album = require("../models/album.model.js");
const Song = require("../models/song.model.js");

module.exports.searchAll = asyncHandler(async (req, res) => {
  const query = req.query.query || "";
  // Use a regex for case-insensitive matching
  const regex = { $regex: query, $options: "i" };

  // 1. Search artists (only artists)
  const artistsPromise = User.aggregate([
    { $match: { role: "artist", fullName: regex } },
    {
      $lookup: {
        from: "songs", 
        localField: "_id",
        foreignField: "artist",
        as: "songs"
      }
    },
    {
      $lookup: {
        from: "albums",
        localField: "_id",
        foreignField: "artist",
        as: "albums"
      }
    },
    {
      $project: {
        fullName: 1,
        email: 1,
        coverImage: 1,
        songs: 1,
        albums: 1
      }
    }
  ]);

  // 2. Search albums
  const albumsPromise = Album.aggregate([
    { $match: { title: regex } },
    {
      $lookup: {
        from: "users",
        localField: "artist",
        foreignField: "_id",
        as: "artistInfo"
      }
    },
    { $unwind: "$artistInfo" },
    {
      $lookup: {
        from: "songs",
        localField: "_id",
        foreignField: "album",
        as: "songs"
      }
    },
    {
      $project: {
        title: 1,
        coverImage: 1,
        releaseDate: 1,
        artistInfo: {
          fullName: 1,
          avatar: 1
        },
        songs: 1
      }
    }
  ]);

  // 3. Search songs
  const songsPromise = Song.aggregate([
    { $match: { title: regex } },
    {
      $lookup: {
        from: "users",
        localField: "artist",
        foreignField: "_id",
        as: "artistInfo"
      }
    },
    { $unwind: "$artistInfo" },
    {
      $lookup: {
        from: "albums",
        localField: "album",
        foreignField: "_id",
        as: "albumInfo"
      }
    },
    {
      $unwind: { path: "$albumInfo", preserveNullAndEmptyArrays: true }
    },
    {
      $project: {
        title: 1,
        duration: 1,
        coverImage: 1,
        audioUrls: 1,
        artistInfo: { fullName: 1, avatar: 1 },
        albumInfo: { title: 1, coverImage: 1 }
      }
    }
  ]);

  const [artists, albums, songs] = await Promise.all([
    artistsPromise,
    albumsPromise,
    songsPromise
  ]);

  res.status(200).json({
    success: true,
    message: "Search results retrieved successfully.",
    data: { artists, albums, songs }
  });
});
