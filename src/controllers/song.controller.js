const { asyncHandler } = require('../utils/asyncHandler.js');
const Song = require('../models/song.model.js');
const User = require('../models/user.model.js');
const Genre = require('../models/genre.model.js');
const { uploadFile } = require('../services/cloudinary.js');
const { findByIdAndUpdate } = require('../models/user.model.js');
const moment = require('moment');
const mongoose = require('mongoose');
const formatDuration = require('../utils/formateDuration.js');

const Subscriber = require('../models/subscriber.model.js');

const sgMail = require('@sendgrid/mail');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const BASE_UNSUBSCRIBE_URL = 'https://odgmusic.com';

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

const sendNewSongNotification = async (songName, coverImage, listenLink) => {
  try {
    const subscribers = await Subscriber.find();
    console.log(
      `[Email Notification] Found ${subscribers.length} active subscribers.`
    );

    if (subscribers.length === 0) {
      console.log(
        '[Email Notification] No active subscribers found to send email to.'
      );
      return { success: true, message: 'No subscribers to notify.' };
    }

    const personalizations = subscribers.map((subscriber) => ({
      to: [{ email: subscriber.email }],
      dynamicTemplateData: {
        subscriberName: subscriber.name || 'Valued Subscriber',
        songName: songName,
        coverImage: coverImage,
        listenLink: listenLink,
        unsubscribeLink: `${BASE_UNSUBSCRIBE_URL}`,
        currentYear: new Date().getFullYear()
      }
    }));

    const msg = {
      from: process.env.SENDGRID_SENDER_EMAIL,
      templateId: process.env.SENDGRID_TEMPLATE_ID,
      personalizations: personalizations
    };

    await sgMail.send(msg);

    console.log(
      `[Email Notification] Successfully sent email for "${songName}" to ${subscribers.length} subscribers.`
    );
    return {
      success: true,
      message: 'Emails initiated successfully.',
      sentCount: subscribers.length
    };
  } catch (error) {
    console.error(
      '[Email Notification] Error sending emails with SendGrid:',
      error
    );
    if (error.response && error.response.body) {
      console.error(
        '[Email Notification] SendGrid API Error Response:',
        error.response.body
      );
      return {
        success: false,
        message: 'SendGrid API error.',
        errorDetails: error.response.body.errors || error.response.body
      };
    }
    return {
      success: false,
      message: 'Internal email sending error.',
      errorDetails: error.message
    };
  }
};

module.exports.uploadSong = asyncHandler(async (req, res) => {
  const { body, files } = req;

  // Ensure 'low' exists
  if (!files.low || files.low.length === 0) {
    return res.status(400).json({
      success: false,
      message: "'low' audio file is required."
    });
  }

  const lowAudioPath = files.low[0].path;
  const lowAudioUrl = await uploadFile(lowAudioPath);
  const lowUrl = lowAudioUrl ? lowAudioUrl.secure_url : '';

  let highUrl = '';
  if (files.high && files.high.length > 0) {
    const highAudioPath = files.high[0].path;
    const highAudioUrl = await uploadFile(highAudioPath);
    highUrl = highAudioUrl ? highAudioUrl.secure_url : '';
  }

  let coverImageUrl = '';
  if (files.coverImage && files.coverImage.length > 0) {
    const coverImagePath = files.coverImage[0].path;
    const coverImageFile = await uploadFile(coverImagePath);
    coverImageUrl = coverImageFile ? coverImageFile.secure_url : '';
  }

  let artistArray = [];
  if (body.artists) {
    try {
      artistArray = JSON.parse(body.artists);
      if (!Array.isArray(artistArray)) throw new Error();
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: 'Invalid artists format. It should be an array of ObjectIds.'
      });
    }
  }
  const durationfix = formatDuration(lowAudioUrl.duration);

  const newSong = new Song({
    title: body.title,
    artist: artistArray,
    duration: durationfix,
    audioUrls: {
      low: lowUrl,
      high: highUrl
    },
    album: body.album || null,
    coverImage: coverImageUrl,
    genre: body.genre,
    freeDownload: body.freeDownload === 'true',
    price: parseFloat(body.price) || 0,
    plays: 0,
    isPublished: body.isPublished !== 'false'
  });

  await newSong.save();
  const songId = new mongoose.Types.ObjectId(newSong._id);

  const populatedSong = await Song.aggregate([
    { $match: { _id: songId } },

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

    {
      $unwind: {
        path: '$genreDetails',
        preserveNullAndEmptyArrays: true
      }
    },

    {
      $addFields: {
        artistNames: {
          $map: {
            input: '$artistDetails',
            as: 'artist',
            in: '$$artist.fullName'
          }
        }
      }
    },

    {
      $project: {
        _id: 1,
        title: 1,
        duration: 1,
        audioUrls: 1,
        album: 1,
        coverImage: 1,
        genreDetails: 1,
        artistDetails: 1,
        artistNames: 1,
        freeDownload: 1,
        price: 1,
        plays: 1,
        isPublished: 1,
        createdAt: 1
      }
    }
  ]);

  const songName = body.title;
  const coverImage = coverImageUrl;
  const listenLink = `https://odgmusic.com/song/${newSong._id}`;

  if (req.body.admin) {
    sendNewSongNotification(songName, coverImage, listenLink)
      .then((emailResult) => {
        console.log('Email notification process summary:', emailResult);
      })
      .catch((emailError) => {
        console.error(
          'Unhandled error in email notification promise chain:',
          emailError
        );
      });
  }

  // Send the response back
  res.status(201).json({
    success: true,
    message: 'Song uploaded successfully!',
    song: populatedSong[0]
  });
});

module.exports.top15 = asyncHandler(async (req, res) => {
  try {
    let topSongs = await Song.aggregate([
      { $match: { plays: { $gt: 0 } } },
      { $sort: { plays: -1 } },
      { $limit: 15 }
    ]);

    const fetchedCount = topSongs.length;

    // Step 2: If fewer than 15, fetch more random songs (excluding already fetched ones)
    if (fetchedCount < 15) {
      const existingIds = topSongs.map((song) => song._id);

      const fillSongs = await Song.aggregate([
        { $match: { _id: { $nin: existingIds } } },
        { $sample: { size: 15 - fetchedCount } }
      ]);

      // Merge both sets
      topSongs = [...topSongs, ...fillSongs];
    }

    // Step 3: Lookup artist and genre info
    const top15 = await Song.aggregate([
      {
        $match: {
          _id: {
            $in: topSongs.map((song) => new mongoose.Types.ObjectId(song._id))
          }
        }
      },

      {
        $lookup: {
          from: 'users',
          localField: 'artist',
          foreignField: '_id',
          as: 'artistInfo'
        }
      },
      { $unwind: { path: '$artistInfo', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'genres',
          localField: 'genre',
          foreignField: '_id',
          as: 'genreInfo'
        }
      },
      { $unwind: { path: '$genreInfo', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          audioUrls: 1,
          title: 1,
          coverImage: 1,
          plays: 1,
          isPublished: 1,
          createdAt: 1,
          updatedAt: 1,
          duration: 1,
          freeDownload: 1,
          price: 1,
          artist: '$artistInfo',
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

module.exports.getWeeklyTop15 = asyncHandler(async (req, res) => {
  try {
    const startOfWeek = moment().startOf('week').toDate();
    const now = new Date();

    // Helper function for enriching songs (lookup artists/genres, etc.)
    const enrichSongs = async (songs) => {
      const enriched = await Song.aggregate([
        {
          $match: { _id: { $in: songs.map((song) => song._id) } }
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
          $lookup: {
            from: 'genres',
            localField: 'genre',
            foreignField: '_id',
            as: 'genreInfo'
          }
        },
        { $unwind: { path: '$genreInfo', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            audioUrls: 1,
            title: 1,
            coverImage: 1,
            plays: 1,
            isPublished: 1,
            createdAt: 1,
            updatedAt: 1,
            duration: 1,
            freeDownload: 1,
            price: 1,
            artist: {
              $map: {
                input: '$artistInfo',
                as: 'a',
                in: {
                  _id: '$$a._id',
                  fullName: '$$a.fullName'
                }
              }
            },

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
      // Maintain original sort order
      return songs.map((s) =>
        enriched.find((e) => e._id.toString() === s._id.toString())
      );
    };

    // Get weekly top songs (deduped by title + artist)
    const weeklySongs = await Song.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfWeek, $lte: now }
        }
      },
      {
        $sort: { plays: -1 }
      },
      {
        $group: {
          _id: {
            title: '$title',
            artist: '$artist'
          },
          doc: { $first: '$$ROOT' }
        }
      },
      {
        $replaceRoot: { newRoot: '$doc' }
      },
      {
        $limit: 15
      }
    ]);

    // If we already have 15, enrich and return
    if (weeklySongs.length === 15) {
      const result = await enrichSongs(weeklySongs);
      return res.status(200).json({
        success: true,
        message: 'Top 15 songs retrieved successfully.',
        data: result
      });
    }

    // Else fetch remaining from all time, excluding already picked
    const existingKeys = new Set(
      weeklySongs.map((song) => `${song.title}-${song.artist.sort().join(',')}`)
    );

    const needed = 15 - weeklySongs.length;

    const fallbackSongs = await Song.aggregate([
      {
        $sort: { plays: -1 }
      },
      {
        $group: {
          _id: {
            title: '$title',
            artist: '$artist'
          },
          doc: { $first: '$$ROOT' }
        }
      },
      {
        $replaceRoot: { newRoot: '$doc' }
      }
    ]);

    // Filter out duplicates already included in weekly
    const uniqueFallback = [];
    for (const song of fallbackSongs) {
      const artistArray = Array.isArray(song.artist)
        ? song.artist
        : [song.artist];
      const key = `${song.title}-${artistArray.map(String).sort().join(',')}`;

      if (!existingKeys.has(key)) {
        uniqueFallback.push(song);
        existingKeys.add(key);
      }
      if (uniqueFallback.length === needed) break;
    }

    const finalTop15 = [...weeklySongs, ...uniqueFallback].sort(
      (a, b) => b.plays - a.plays
    );
    const enrichedFinal = await enrichSongs(finalTop15);

    if (!enrichedFinal || enrichedFinal.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No songs found.'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Top 15 songs retrieved successfully.',
      data: enrichedFinal
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
      .populate('artist', 'fullName _id') // Populate artists array with fullName and _id
      .populate('album', 'title');

    // Search functionality
    if (search) {
      baseQuery = baseQuery.or([
        { title: { $regex: search, $options: 'i' } },
        { 'artist.fullName': { $regex: search, $options: 'i' } }, // Search within artists array
        { 'album.title': { $regex: search, $options: 'i' } }
      ]);
    }

    // Clone query for counting
    const countQuery = baseQuery.clone().countDocuments();

    // Pagination
    const dataQuery = baseQuery
      .skip(skip)
      .limit(parsedLimit)
      .select('title coverImage duration artist album') // Include artists in select
      .lean();

    // Execute both queries in parallel
    const [total, songs] = await Promise.all([countQuery, dataQuery]);

    // Format duration for frontend
    const formattedSongs = songs.map((song) => ({
      ...song,
      duration: song.duration,
      artist: song.artist
        ? song.artist.map((artist) => ({
            fullName: artist.fullName,
            _id: artist._id
          }))
        : [], // Format artists array
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
    const allSongs = await Song.aggregate([
      {
        $match: { isPublished: true }
      },
      {
        $sort: { createdAt: -1 }
      },
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
      { $unwind: { path: '$genreDetails', preserveNullAndEmptyArrays: true } },
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
      {
        $project: {
          _id: 1,
          title: 1,
          rank: 1,
          artist: 1,
          artistDetails: {
            $map: {
              input: '$artistDetails',
              as: 'a',
              in: {
                _id: '$$a._id',
                fullName: '$$a.fullName',
                avatar: '$$a.avatar',
                email: '$$a.email'
              }
            }
          },
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

    // Deduplicate by title + sorted artist array
    const seen = new Set();
    const uniqueSongs = [];

    for (const song of allSongs) {
      const artistArray = Array.isArray(song.artist)
        ? song.artist
        : [song.artist];
      const key = `${song.title}-${artistArray.map(String).sort().join(',')}`;

      if (!seen.has(key)) {
        seen.add(key);
        uniqueSongs.push(song);
      }

      if (uniqueSongs.length === 10) break;
    }

    res.status(200).json({
      success: true,
      count: uniqueSongs.length,
      data: uniqueSongs
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
        message: 'Search query is required'
      });
    }

    const songs = await Song.find({
      title: { $regex: query, $options: 'i' }
    })
      .populate({
        path: 'artist',
        select: 'fullName _id coverImage' // Fetch specific artist fields
      })
      .populate({
        path: 'album',
        select: '_id title coverImage releaseDate' // Fetch specific album fields
      })
      .populate({
        path: 'genre',
        select: 'name _id' // Fetch genre name
      });

    if (!songs || songs.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No Song found matching your search.'
      });
    }

    res.status(200).json({
      success: true,
      message: `Found ${songs.length} Song(s) matching "${query}".`,
      data: songs
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'An error occurred while searching for songs.'
    });
  }
});
module.exports.getSongInfo = asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
  
    const song = await Song.findById(id)
      .populate({
        path: 'album',
        select: '_id title coverImage' // Include album details you need
      })
      .populate({
        path: 'artist',
        select: '_id fullName stripeId paypalId admin'
      })
      .populate({
        path: 'genre',
        select: '_id name'
      });

    if (song) {
      res.status(200).json({
        success: true,
        data: song,
        message: 'Song details retrieved successfully.'
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Song not found.'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error. Could not retrieve song details.',
      error: error.message
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
    const songs = await Song.find({ genre: genre._id })
      .populate({
        path: 'artist',
        select: 'fullName' // Select only the fullName field
      })
      .select('-album');

    return res.json({ songs });
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error });
  }
});
module.exports.isPurchased = asyncHandler(async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const isPurchased = user.purchasedSongs.includes(req.params.songId);
    res.json({ isPurchased });
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports.incresePlayCont = asyncHandler(async (req, res) => {
  const { id } = req.body;

  if (!id) {
    return res
      .status(400)
      .json({ success: false, message: 'Song ID is required' });
  }

  const song = await Song.findByIdAndUpdate(
    id,
    { $inc: { plays: 1 } },
    { new: true }
  );

  if (!song) {
    return res.status(404).json({ success: false, message: 'Song not found' });
  }

  res.status(200).json({
    success: true,
    message: 'Play count increased',
    plays: song.plays
  });
});

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
    if (coverImageUrl != '') song.coverImage = coverImageUrl;
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

module.exports.getTotalSongs = asyncHandler(async (req, res) => {
  try {
    const totalSongs = await Song.countDocuments();
    res.status(200).json({ total: totalSongs }); // Send a JSON response with status 200 (OK)
  } catch (error) {
    console.error('Error while fetching total songs:', error); // It's better to use console.error for errors
    res.status(500).json({
      message: 'Failed to fetch total number of songs',
      error: error.message
    });
  }
});
