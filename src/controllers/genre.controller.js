const Genre = require('../models/genre.model.js');
const { asyncHandler } = require('../utils/asyncHandler.js');

// Bulk upload genres
exports.bulkUploadGenres = asyncHandler(async (req, res) => {
  const genres = req.body.genres; // Expecting an array of genres in the request body

  if (!genres || !Array.isArray(genres) || genres.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a valid array of genres'
    });
  }

  try {
    // Insert many genres
    const newGenres = await Genre.insertMany(genres, { ordered: false });

    res.status(201).json({
      success: true,
      message: `${newGenres.length} genres inserted successfully`,
      data: newGenres
    });
  } catch (error) {
    // Handle errors such as duplicate entries
    return res.status(500).json({
      success: false,
      message: error.message || 'An error occurred while uploading genres'
    });
  }
});

exports.getGenre = asyncHandler(async (req, res) => {
  try {
    const genre = await Genre.find();
    if (!genre)
      return res
        .status(201)
        .json({ success: false, message: 'no genre found' });
    return res.status(200).json(genre);
  } catch (error) {
    return res.status(500).json({ success: false, message: 'server error ' });
  }
});
