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
        $match: {
          isFeatured: true
        }
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
        $unwind: '$artist'
      },

      {
        $lookup: {
          from: 'songs',
          localField: '_id', // album's _id
          foreignField: 'album',
          as: 'songsData'
        }
      },

      {
        $addFields: {
          totalSongs: { $size: '$songsData' },

          songs: '$songsData'
        }
      },

      {
        $project: {
          title: 1,
          releaseYear: 1,
          coverImage: 1,
          totalSongs: 1,
          'artist.fullName': 1,

          'songs.title': 1,
          'songs.duration': 1,
          createdAt: 1
        }
      },

      {
        $sort: { createdAt: -1 }
      }
    ]);

    if (!featuredAlbums || featuredAlbums.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No featured albums found matching criteria.'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Featured albums retrieved successfully.',
      data: featuredAlbums
    });
  } catch (error) {
    console.error('Error while fetching featured albums:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while fetching albums.',
      error: error.message
    });
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
 
      { $match: { _id: albumId } },

    
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
        $lookup: {
          from: 'songs',
          localField: '_id', // album's _id
          foreignField: 'album', // matching songs where 'album' is the same as album _id
          as: 'songs'
        }
      },

      {
        $unwind: {
          path: '$songs',
          preserveNullAndEmptyArrays: true // Keeps albums even if they have no songs
        }
      },
      {
        $lookup: {
          from: 'comments',
          localField: '_id', // album's _id
          foreignField: 'album', // matching comments where 'album' is the same as album _id
          as: 'comments'
        }
      },
      {
        $lookup: {
          from: 'users', // Assuming 'users' is the collection for artists
          localField: 'songs.artist', // 'artist' is an array of ObjectId in Song
          foreignField: '_id',
          as: 'songs.artistDetails'
        }
      },

      // Step 4: Regroup songs back into an array after unwinding
      {
        $group: {
          _id: '$_id',
          albumTitle: { $first: '$title' },
          coverImage: { $first: '$coverImage' },
          releaseDate: { $first: '$releaseDate' },
          company: { $first: '$company' },
          artistDetails: { $first: '$artistDetails' },
          genreDetails: { $first: '$genreDetails' },
          comments: { $first: '$comments' },
          songs: { $push: '$songs' } 
        }
      },

      // Step 5: Add totalSongs and totalDuration
      {
        $addFields: {
          totalSongs: { $size: '$songs' }, // Counting number of songs
          totalDuration: {
            $sum: {
              $map: {
                input: '$songs',
                as: 'song',
                in: {
                  $add: [
                    {
                      $multiply: [
                        {
                          $toInt: {
                            $arrayElemAt: [
                              { $split: ['$$song.duration', ':'] },
                              0
                            ]
                          }
                        }, // minutes
                        60
                      ]
                    },
                    {
                      $toInt: {
                        $arrayElemAt: [{ $split: ['$$song.duration', ':'] }, 1]
                      }
                    } // seconds
                  ]
                }
              }
            }
          }
        }
      },

      // Step 6: Unwind artist and genre arrays properly
      { $unwind: { path: '$artistDetails', preserveNullAndEmptyArrays: true } },
      { $unwind: { path: '$genreDetails', preserveNullAndEmptyArrays: true } },

      // Step 7: Modify songs array to include artist details properly
      {
        $addFields: {
          songs: {
            $map: {
              input: '$songs',
              as: 'song',
              in: {
                $mergeObjects: [
                  '$$song', // Include all original song fields
                  {
                    artist: {
                      $map: {
                        input: '$$song.artistDetails',
                        as: 'artist',
                        in: '$$artist.fullName'
                      }
                    }
                  } // Map artistDetails into artist names array
                ]
              }
            }
          }
        }
      },

      // Step 8: Select only the fields we need
      {
        $project: {
          _id: 1,
          title: '$albumTitle',
          company: 1,
          releaseDate: 1,
          coverImage: 1,
          artistDetails: 1,
          artist: '$artistDetails.fullName',
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

module.exports.searchAlbums = asyncHandler(async (req, res) => {
  try {
    const { query } = req.query;

    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    const albums = await Album.find({
      title: { $regex: query, $options: 'i' } // Case-insensitive search
    });

    if (!albums || albums.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No albums found matching your search.'
      });
    }

    res.status(200).json({
      success: true,
      message: `Found ${albums.length} album(s) matching "${query}".`,
      data: albums
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'An error occurred while searching for albums.'
    });
  }
});

module.exports.filterAlbums = asyncHandler(async (req, res) => {
  try {
    const { filterType, value } = req.query;

    let filterCondition = {};

    switch (filterType) {
      case 'genre':
        filterCondition = { genre: value }; // Assuming genre is a string
        break;
      case 'artist':
        filterCondition = { artist: value }; // Assuming artist is an ID or string
        break;
      case 'releaseDate':
        // Assuming value is in the format 'YYYY-MM-DD' or a year like '2022'
        filterCondition = { releaseDate: { $gte: new Date(value) } };
        break;
      case 'popularity':
        // Assuming albums have a 'plays' field for popularity
        filterCondition = {}; // No specific condition, sort by plays below
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid filter type.'
        });
    }

    let albums;

    // Handle the popularity filter separately (sort by 'plays')
    if (filterType === 'popularity') {
      albums = await Album.find(filterCondition).sort({ plays: -1 });
    } else {
      albums = await Album.find(filterCondition);
    }

    if (!albums || albums.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No albums found for the selected filter: ${filterType}`
      });
    }

    res.status(200).json({
      success: true,
      message: `Found ${albums.length} album(s) for filter: ${filterType}.`,
      data: albums
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'An error occurred while filtering albums.'
    });
  }
});


module.exports.getTop15 = asyncHandler(async (req, res) => {
  try {
    const albums = await Album.find({})
      .sort({ createdAt: -1 }) // Latest first
      .limit(15)
      .populate('artist', 'fullName') // Optional: include artist full name
      .populate('genre', 'name');     // Optional: include genre name

    return res.status(200).json({
      success: true,
      data: albums,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch top albums',
      error,
    });
  }
});

// module.exports.getTop15 = asyncHandler(async (req, res) => {
//   try {
//     const top15 = await Album.aggregate([
//       // Step 1: Lookup to join with the songs collection
//       {
//         $lookup: {
//           from: 'songs',
//           localField: 'songs',
//           foreignField: '_id',
//           as: 'albumSongs'
//         }
//       },
//       // Step 2: Unwind the albumSongs array
//       { $unwind: '$albumSongs' },

      
//       {
//         $group: {
//           _id: '$_id',
//           title: { $first: '$title' },
//           artist: { $first: '$artist' },
//           coverImage: { $first: '$coverImage' },
//           totalPlays: { $sum: '$albumSongs.plays' } // Sum the plays for each song in the album
//         }
//       },

//       { $sort: { totalPlays: -1 } },

//       // Step 5: Limit the results to the top 15 albums
//       { $limit: 15 }
//     ]);

//     // Send the top 15 albums as the response
//     res.status(200).json({
//       success: true,
//       data: top15
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message
//     });
//   }
// });
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
        $addFields: {
          artist: {
            $cond: [
              { $gt: [{ $size: '$artist' }, 0] },
              { $arrayElemAt: ['$artist', 0] },
              { fullName: 'Unknown Artist', _id: null }
            ]
          }
        }
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
  const { name, email, comment, albumId } = req.body;

  if (!comment || !name || !email || !albumId)
    return res
      .status(400)
      .json({ message: 'Comment, userId, albumId required' });
  const commentInfo = await Comment.create({
    name,
    email,
    comment,
    album: albumId
  });
  if (!commentInfo)
    return res.status(500).json({ message: 'comment creation failed ' });
  return res.status(200).json({ message: 'Commented.' });
});

module.exports.addAlbums = asyncHandler(async (req, res) => {
  const { title, artist, genre, company, isFeatured, isTranding } = req.body;

  if (!title || !artist || !genre || !company) {
    return res.status(400).json({
      success: false,
      message: 'All fields are required'
    });
  }

  const file = req.file;
  let coverImageUrl = '';

  // Upload cover image if exists
  if (file) {
    try {
      const uploaded = await uploadFile(file.path);
      coverImageUrl = uploaded?.secure_url || '';
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: 'Error uploading cover image',
        error: err.message
      });
    }
  }

  // Handle artist input (array or single)
  let artistArray = [];

  try {
    const parsed = JSON.parse(artist);
    if (Array.isArray(parsed)) {
      artistArray = parsed.map((id) => new mongoose.Types.ObjectId(id));
    } else if (typeof parsed === 'string') {
      artistArray = [new mongoose.Types.ObjectId(parsed)];
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid artist data format'
      });
    }
  } catch (err) {
    // If it's not a JSON string, assume it's a single artist ID
    if (mongoose.Types.ObjectId.isValid(artist)) {
      artistArray = [new mongoose.Types.ObjectId(artist)];
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid artist ID'
      });
    }
  }

  // Create and save the album
  try {
    const album = new Album({
      title,
      artist: artistArray,
      coverImage: coverImageUrl,
      genre,
      company,
      isTranding,
      isFeatured,
      releaseDate: new Date()
    });

    const saved = await album.save();
    res.status(201).json({
      success: true,
      message: 'Album created successfully',
      album: saved
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error saving album',
      error: error.message
    });
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

module.exports.getAlumByUserId = asyncHandler(async (req, res) => {
  const { id } = req.params;



  if (!id)
    return res.status(400).json({ success: false, message: 'Id not provided' });
  const albums = await Album.find({ artist: id }).lean();

  if (!albums || albums.length === 0) {
    return res.status(200).json({
      success: false,
      message: 'No albums found for this artist'
    });
  }
  return res
    .status(200)
    .json({ success: true, message: 'Album fetch ed successfully', albums });
});

module.exports.getTotalAlbums = asyncHandler(async (req, res) => {
  try {
    const totalAlbum = await Album.countDocuments();
    res.status(200).json({ total: totalAlbum }); // Send a JSON response with status 200 (OK)
  } catch (error) {
    console.error('Error while fetching total songs:', error); // It's better to use console.error for errors
    res.status(500).json({
      message: 'Failed to fetch total number of songs',
      error: error.message
    });
  }
});
