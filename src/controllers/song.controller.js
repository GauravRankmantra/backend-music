const { asyncHandler } = require('../utils/asyncHandler.js');
const Song = require('../models/song.model.js');
const User = require("../models/user.model.js")
const Genre = require('../models/genre.model.js');
const { uploadFile } = require('../services/cloudinary.js');
const { findByIdAndUpdate } = require('../models/user.model.js');
const moment = require('moment');

// function formatDuration(duration) {
//   if (duration < 10) {
//     // Assume the value is in minutes
//     const minutes = Math.floor(duration);
//     const seconds = Math.round((duration - minutes) * 60);
//     return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
//   } else {
//     // Assume the value is in seconds
//     const totalSeconds = Math.round(duration);
//     const minutes = Math.floor(totalSeconds / 60);
//     const seconds = totalSeconds % 60;
//     return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
//   }
// }


module.exports.uploadSong = asyncHandler(async (req, res) => {
  const { body, files } = req;

  // Ensure 'low' exists
  if (!files.low || files.low.length === 0) {
    return res.status(400).json({
      success: false,
      message: "'low' audio file is required."
    });
  }

  // Upload the 'low' audio file
  const lowAudioPath = files.low[0].path;
  const lowAudioUrl = await uploadFile(lowAudioPath); // Cloudinary upload for 'low'
  const lowUrl = lowAudioUrl ? lowAudioUrl.secure_url : '';

  let highUrl = '';
  if (files.high && files.high.length > 0) {
    const highAudioPath = files.high[0].path;
    const highAudioUrl = await uploadFile(highAudioPath); // Cloudinary upload for 'high'
    highUrl = highAudioUrl ? highAudioUrl.secure_url : '';
  }

  // Upload the 'coverImage' file if it exists
  let coverImageUrl = '';
  if (files.coverImage && files.coverImage.length > 0) {
    const coverImagePath = files.coverImage[0].path;
    const coverImageFile = await uploadFile(coverImagePath); // Cloudinary upload for 'coverImage'
    coverImageUrl = coverImageFile ? coverImageFile.secure_url : '';
  }

  // Prepare the data to be saved in the Song model
  const newSong = new Song({
    title: body.title,
    artist: body.artist,
    duration:
      lowAudioUrl.duration >= 60
        ? lowAudioUrl.duration / 60
        : lowAudioUrl.duration,
    audioUrls: {
      low: lowUrl,
      high: highUrl
    },
    album: body.album ? body.album : null,
    coverImage: coverImageUrl,
    genre: body.genre,
    freeDownload:body.freeDownload,
    price:body.price,
    plays: 0, // Optional: Can be dynamically set or start from 0
    isPublished: body.isPublished || true // Default to true
  });

  // Save the song in the database
  await newSong.save();

  // Send the response back
  res.status(201).json({
    success: true,
    message: 'Song uploaded successfully!',
    song: newSong
  });
});

module.exports.getWeeklyTop15 = asyncHandler(async (req, res) => {
  try {
    const top15 = await Song.aggregate([
      {
        $sort: { plays: -1 }
      },
      {
        $limit: 15 // Limit to top 15 songs
      },
      {
        $lookup: {
          from: 'users',
          localField: 'artist',
          foreignField: '_id',
          as: 'artistInfo'
        }
      },
      {
        $unwind: '$artistInfo'
      },
      {
        $lookup: {
          from: 'genres',
          localField: 'genre',
          foreignField: '_id',
          as: 'genreInfo'
        }
      },
      {
        $unwind: '$genreInfo'
      },
      {
        $project: {
          audioUrls: 1,
          title: 1,
          coverImage: 1,
          plays: 1,
          isPublished: 1,
          createdAt: 1,
          updatedAt: 1,
          duration:1,

          artist: '$artistInfo.fullName',
          genre: '$genreInfo.name',
          rank: {
            $cond: {
              if: { $eq: [{ $type: '$rank' }, 'missing'] },
              then: 0,
              else: '$rank'
            }
          }
        }
      }
    ]);

    if (!top15 || top15.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No songs found.'
      });
    }


    res.status(200).json({
      success: true,
      message: 'Top 15 songs retrieved successfully.',
      data: top15
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'An error occurred while retrieving songs.'
    });
  }
});

module.exports.getAllSongs = asyncHandler(async (req, res) => {
  const { search, page = 1, limit = 10 } = req.query;
  try {
    // Pagination setup
    const parsedPage = Math.max(parseInt(page) || 1, 1);
    const parsedLimit = Math.max(parseInt(limit) || 10, 1);
    const skip = (parsedPage - 1) * parsedLimit;

    // Base query
    let baseQuery = Song.find()
      .populate('artist', 'fullName')
      .populate('album', 'title');
 

    // Search functionality
    if (search) {
      baseQuery = baseQuery.or([
        { title: { $regex: search, $options: 'i' } },
        { 'artist.fullName': { $regex: search, $options: 'i' } },
        { 'album.title': { $regex: search, $options: 'i' } }
      ]);
    }

    // Clone query for counting
    const countQuery = baseQuery.clone().countDocuments();

    // Pagination
    const dataQuery = baseQuery
      .skip(skip)
      .limit(parsedLimit)
      .select('title coverImage duration artist album')
      .lean();

    // Execute both queries in parallel
    const [total, songs] = await Promise.all([countQuery, dataQuery]);

    // Format duration for frontend
    const formattedSongs = songs.map((song) => ({
      ...song,
      duration: song.duration,
      artist: song.artist ? { fullName: song.artist.fullName } : null,
      album: song.album ? { title: song.album.title } : null
    }));

    res.status(200).json({
      data: formattedSongs,
      total,
      pages: Math.ceil(total / parsedLimit),
      currentPage: parsedPage
    });
  } catch (error) {
    console.error('Error fetching songs:', error);
    res.status(500).json({
      message: error.message || 'Server error while fetching songs',
      errorCode: 'SONGS_FETCH_ERROR'
    });
  }
});

module.exports.getNewReleaseSong = asyncHandler(async (req, res) => {
  try {
    const latestSongs = await Song.aggregate([
      {
        $match: { isPublished: true }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'artist',
          foreignField: '_id',
          as: 'artistDetails'
        }
      },
      { $unwind: '$artistDetails' },
      {
        $lookup: {
          from: 'genres',
          localField: 'genre',
          foreignField: '_id',
          as: 'genreDetails'
        }
      },
      { $unwind: '$genreDetails' },
      {
        $lookup: {
          from: 'albums',
          localField: 'album',
          foreignField: '_id',
          as: 'albumDetails'
        }
      },
      {
        $unwind: { path: '$albumDetails', preserveNullAndEmptyArrays: true }
      },
      { $sort: { createdAt: -1 } },
      { $limit: 10 },
      {
        $project: {
          _id: 1,
          title: 1,
          rank: 1,
          artistDetails: 1,
          albumDetails: 1,
          genreDetails: 1,
          duration: 1,
          audioUrls: 1,
          coverImage: 1,
          plays: 1,
          createdAt: 1
        }
      }
    ]);

    // Map through the results and format the duration


    res.status(200).json({
      success: true,
      count: latestSongs.length,
      data: latestSongs
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
});
module.exports.searchSong = asyncHandler(async (req, res) => {
  try {
    const { query } = req.query;

    if (!query) {
      return res.status(400).json({
        success: false,
        message: "Search query is required",
      });
    }

    const songs = await Song.find({
      title: { $regex: query, $options: "i" }, 
    })
      .populate({
        path: "artist",
        select: "fullName _id coverImage", // Fetch specific artist fields
      })
      .populate({
        path: "album",
        select: "_id title coverImage releaseDate", // Fetch specific album fields
      })
      .populate({
        path: "genre",
        select: "name _id", // Fetch genre name
      });

    if (!songs || songs.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No Song found matching your search.",
      });
    }


    

    res.status(200).json({
      success: true,
      message: `Found ${songs.length} Song(s) matching "${query}".`,
      data: songs,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "An error occurred while searching for songs.",
    });
  }
});

module.exports.getSongByGenre = asyncHandler(async (req, res) => {
  try {
    const genreName = req.params.name.toLowerCase();

    // Find the genre by name
    const genre = await Genre.findOne({ name: genreName });
    if (!genre) {
      return res.status(404).json({ message: 'Genre not found' });
    }

    // Find songs by genre id
    const songs = await Song.find({ genre: genre._id }).populate({
      path: 'artist',
      select: 'fullName', // Select only the fullName field
    }).select('-album')

    return res.json({ songs });
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error });
  }
});
module.exports.isPurchased=asyncHandler(async(req,res)=>{
  try {
    const user = await User.findById(req.user._id);
    const isPurchased = user.purchasedSongs.includes(req.params.songId);
    res.json({ isPurchased });
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
})


module.exports.deleteSong = asyncHandler(async (req, res) => {
  const user = req.user;
  const { id } = req.params;

  const song = await Song.findById(id);
  //if (user.role == 'admin' || user._id.equals(song.artist)) {
  const del = await Song.findByIdAndDelete(id);
  if (!del) {
    return res.status(500).json({ success: false, message: 'Deletion failed' });
  }
  return res
    .status(200)
    .json({ success: true, message: 'Song deleted successfully' });
  //}
  return res
    .status(401)
    .json({ success: false, message: 'Unauthorize access' });
});

module.exports.updateSong = asyncHandler(async (req, res) => {
  const user = req.user;
  const userId = user._id;
  const { id } = req.params;

  const { title, genre, isPublished } = req.body;

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

  const song = await Song.findById(id);

  if (!song)
    return res.status(404).json({ success: false, message: 'No song found' });
  if (user.role == 'admin' || userId.equals(song.artist)) {
    if (coverImageUrl != '') song.coverImageUrl = coverImageUrl;
    if (title) song.title = title;
    if (genre) song.genre = genre;
    if (typeof isPublished !== 'undefined') song.isPublished = isPublished;
    await song.save();
    return res
      .status(200)
      .json({ success: true, message: 'Song info updates successfully' });
  }
  return res
    .status(401)
    .json({ success: false, message: 'Unauthorize access' });
});

module.exports.thisWeekTotalSongUploded = asyncHandler(async (req, res) => {
  try {
    // Get start and end date of the current week
    const startOfWeek = moment().startOf('isoWeek').toDate();
    const endOfWeek = moment().endOf('isoWeek').toDate();

    // Fetch songs uploaded within this week based on `createdAt` from timestamps
    const songs = await Song.aggregate([
      {
        $match: {
          createdAt: {
            $gte: startOfWeek,
            $lte: endOfWeek
          },
          isPublished: true // Ensure only published songs are counted
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, // Group by date
          uploadedSongs: { $sum: 1 } // Count songs per day
        }
      },
      {
        $sort: { _id: 1 } // Sort by date
      }
    ]);

    // Map the result to an array with date and uploadedSongs
    const data = songs.map((song) => ({
      date: song._id,
      uploadedSongs: song.uploadedSongs
    }));

    // Send success response with data
    res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Error fetching songs uploaded this week:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// module.exports.getSongDetail = asyncHandler(async(req,res)=>{
//   const id=req.params;
//   const Song = await Song.aggregate([
//     {
//       $match :{_id:id}
//     },{
//       $lookup:{
//         from
//       }
//     }
//   ])
// })
