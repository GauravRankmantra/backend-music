const Genre = require('../models/genre.model.js');
const { asyncHandler } = require('../utils/asyncHandler.js');
const { uploadFile } = require('../services/cloudinary.js');
const mongoose = require('mongoose');

// Bulk upload genres
exports.uploadGenre = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  const file = req.file;

  if (!name || typeof name !== 'string' || name.trim() === '') {
    return res.status(400).json({
      success: false,
      message: 'Please provide a valid genre name'
    });
  }

  if (description && typeof description !== 'string') {
    return res.status(400).json({
      success: false,
      message: 'Description must be a string'
    });
  }

  // Check if genre already exists
  const existingGenre = await Genre.findOne({
    name: { $regex: new RegExp(`^${name}$`, 'i') }
  });

  if (existingGenre) {
    return res.status(409).json({
      success: false,
      message: 'Genre already exists'
    });
  }

  // Upload image if exists
  let imageUrl = '';
  if (file) {
    const imagePath = file.path;
    try {
      const uploadedImage = await uploadFile(imagePath); // Upload to Cloudinary
      imageUrl = uploadedImage?.secure_url || '';
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Error uploading genre image',
        error
      });
    }
  }

  // Create genre
  const genreData = {
    name,
    discription: description,
    image: imageUrl
  };

  const newGenre = await Genre.create(genreData);

  res.status(201).json({
    success: true,
    message: 'Genre uploaded successfully',
    data: newGenre
  });
});
exports.deleteGenre = asyncHandler(async (req, res) => {
  const { id } = req.params; // Expecting the genre ID in the URL parameters

  if (!id) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a genre ID'
    });
  }

  try {
    const deletedGenre = await Genre.findByIdAndDelete(id);

    if (!deletedGenre) {
      return res.status(404).json({
        success: false,
        message: 'Genre not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Genre deleted successfully',
      data: deletedGenre
    });
  } catch (error) {
    // Handle invalid ID format or other database errors
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid genre ID format'
      });
    }
    return res.status(500).json({
      success: false,
      message: error.message || 'An error occurred while deleting the genre'
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
exports.getGenreById = asyncHandler(async (req, res) => {
  const id = req.params.id;
  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ success: false, message: 'Invalid genre ID' });
    }
    const genre = await Genre.findById(id);
    if (!genre) {
      return res
        .status(404) // Use 404 Not Found for a resource that doesn't exist
        .json({ success: false, message: 'No genre found' });
    }
    return res.status(200).json({ success: true, data: genre }); // Indicate success and send the data
  } catch (error) {
    console.error('Error fetching genre:', error); // Log the error for debugging
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});
exports.updateGenre = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, description } = req.body;
  const file = req.file;

  if (!id) {
    return res
      .status(400)
      .json({ success: false, message: 'Genre ID is required' });
  }

  // Fetch existing genre
  const genre = await Genre.findById(id);
  if (!genre) {
    return res.status(404).json({ success: false, message: 'Genre not found' });
  }

  const updateData = {};

  // Validate and update name
  if (name) {
    if (typeof name !== 'string' || name.trim() === '') {
      return res
        .status(400)
        .json({ success: false, message: 'Invalid genre name' });
    }

    // Check for duplicate name (case insensitive)
    const existing = await Genre.findOne({
      name: { $regex: new RegExp(`^${name}$`, 'i') },
      _id: { $ne: id } // exclude current genre from duplicate check
    });

    if (existing) {
      return res
        .status(409)
        .json({ success: false, message: 'Genre name already exists' });
    }

    updateData.name = name;
  }

  // Validate and update description
  if (description !== undefined) {
    if (typeof description !== 'string') {
      return res
        .status(400)
        .json({ success: false, message: 'Description must be a string' });
    }
    updateData.discription = description;
  }

  // If image file is provided, upload to Cloudinary
  if (file) {
    try {
      const uploaded = await uploadFile(file.path);
      updateData.image = uploaded?.secure_url || '';
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: 'Error uploading image',
        error: err.message || err
      });
    }
  }

  // Update the genre
  const updatedGenre = await Genre.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    success: true,
    message: 'Genre updated successfully',
    data: updatedGenre
  });
});
