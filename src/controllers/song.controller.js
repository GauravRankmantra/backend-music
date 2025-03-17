const { asyncHandler } = require('../utils/asyncHandler.js');
const Song = require('../models/song.model.js');
const { uploadFile } = require('../services/cloudinary.js');
const { findByIdAndUpdate } = require('../models/user.model.js');

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
  try {
    const allSongs = await Song.find()
      .populate('artist', 'fullName')
      .populate('genre', 'name');

    if (!allSongs || allSongs.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No songs found.'
      });
    }

    res.status(200).json({
      success: true,
      message: 'All songs retrieved successfully.',
      data: allSongs
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'An error occurred while retrieving songs.'
    });
  }
});

module.exports.deleteSong = asyncHandler(async (req, res) => {
  const user = req.user;
  const { id } = req.params;

  const song = await Song.findById(id);
  //if (user.role == 'admin' || user._id.equals(song.artist)) {
    const del = await Song.findByIdAndDelete(id);
    if (!del) {
      return res
        .status(500)
        .json({ success: false, message: 'Deletion failed' });
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