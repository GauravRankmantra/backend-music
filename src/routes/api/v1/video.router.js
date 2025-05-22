const express = require('express');
const router = express.Router();
const { uploadVideo } = require('../../../middlelwares/multer.middleware.js'); // Assuming this path is correct
const { uploadFile, destroyFile } = require('../../../services/cloudinary.js'); // Assuming this path is correct
const Video = require("../../../models/video.model.js"); // Updated model name
const { v2: cloudinary } = require('cloudinary'); // Ensure cloudinary is configured globally or passed via services

// Ensure Cloudinary is configured - place this in your main app.js or config file
// cloudinary.config({
//   cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
//   api_key: process.env.CLOUDINARY_API_KEY,
//   api_secret: process.env.CLOUDINARY_API_SECRET
// });

/**
 * @route POST /api/v1/AdminVideo
 * @desc Upload a new video
 * @access Admin (add authentication middleware later if needed)
 */
router.post('/', uploadVideo.single('video'), async (req, res) => {
  try {
    const { title, description } = req.body;

    console.log('request file', req.file);

    // Input validation
    if (!req.file) {
      return res.status(400).json({ message: 'No video file provided.' });
    }
    if (!title || title.trim().length < 3) {
      return res
        .status(400)
        .json({
          message:
            'Video title is required and must be at least 3 characters long.'
        });
    }

    // Upload to Cloudinary
   const result = await uploadFile(req.file.path, 'video', 'videos');
// Use a specific folder like 'videos'
    if (!result) {
      return res
        .status(500)
        .json({ message: 'Video upload to Cloudinary failed.' });
    }

    // Create new video document
    const newVideo = new Video({
      title: title.trim(),
      description: description ? description.trim() : '',
      url: result.secure_url,
      public_id: result.public_id,
      resource_type: result.resource_type,
      views: 0 // Initial views
    });

    await newVideo.save();

    res
      .status(201)
      .json({ message: 'Video uploaded successfully!', video: newVideo });
  } catch (error) {
    console.error('Error uploading video:', error);
    // Clean up partially uploaded file if error occurs after cloudinary upload
    if (req.file && req.file.path) {
      // fs.unlinkSync(req.file.path); // If you're saving local files temporarily
    }
    res
      .status(500)
      .json({
        message: 'Server error during video upload.',
        error: error.message
      });
  }
});

/**
 * @route GET /api/v1/AdminVideo
 * @desc Get all videos
 * @access Public (or Admin, depending on design)
 */
router.get('/', async (req, res) => {
  try {
    const videos = await Video.find({}).sort({ createdAt: -1 }); // Get all videos, newest first
    res.status(200).json(videos);
  } catch (error) {
    console.error('Error fetching videos:', error);
    res
      .status(500)
      .json({ message: 'Server error fetching videos.', error: error.message });
  }
});

/**
 * @route GET /api/v1/AdminVideo/:id
 * @desc Get a single video by ID
 * @access Public (or Admin)
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const video = await Video.findById(id);

    if (!video) {
      return res.status(404).json({ message: 'Video not found.' });
    }
    res.status(200).json(video);
  } catch (error) {
    console.error('Error fetching single video:', error);
    // Handle invalid MongoDB ID format
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ message: 'Invalid video ID format.' });
    }
    res
      .status(500)
      .json({ message: 'Server error fetching video.', error: error.message });
  }
});

/**
 * @route PUT /api/v1/AdminVideo/:id
 * @desc Update an existing video (title or replace file)
 * @access Admin
 */
router.put('/:id', uploadVideo.single('video'), async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description } = req.body;

    // Basic validation for title
    if (title && title.trim().length < 3) {
      return res
        .status(400)
        .json({
          message: 'Video title must be at least 3 characters long if provided.'
        });
    }

    let video = await Video.findById(id);
    if (!video) {
      return res.status(404).json({ message: 'Video not found.' });
    }

    // Update title and description if provided
    if (title) video.title = title.trim();
    if (description) video.description = description.trim();

    // If a new video file is provided, upload it and replace the old one
    if (req.file) {
      // Delete old video from Cloudinary
      if (video.public_id) {
        await destroyFile(video.public_id, 'video');
      }

      // Upload new video to Cloudinary
  const result = await uploadFile(req.file.path, 'video', 'videos');
      if (!result) {
        return res
          .status(500)
          .json({ message: 'New video file upload to Cloudinary failed.' });
      }
      video.url = result.secure_url;
      video.public_id = result.public_id;
      video.resource_type = result.resource_type;
    }

    await video.save(); // Save the updated video

    res
      .status(200)
      .json({ message: 'Video updated successfully!', video: video });
  } catch (error) {
    console.error('Error updating video:', error);
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ message: 'Invalid video ID format.' });
    }
    res
      .status(500)
      .json({ message: 'Server error updating video.', error: error.message });
  }
});

/**
 * @route DELETE /api/v1/AdminVideo/:id
 * @desc Delete a specific video by ID
 * @access Admin
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const video = await Video.findById(id);

    if (!video) {
      return res.status(404).json({ message: 'Video not found.' });
    }

    // Delete from Cloudinary
    if (video.public_id) {
      await destroyFile(video.public_id, 'video'); // Pass resource_type for videos
    }

    await video.deleteOne(); // Delete from MongoDB

    res.status(200).json({ message: 'Video deleted successfully!' });
  } catch (error) {
    console.error('Error deleting video:', error);
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ message: 'Invalid video ID format.' });
    }
    res
      .status(500)
      .json({ message: 'Server error deleting video.', error: error.message });
  }
});

// Optional: Route to increment views
/**
 * @route PATCH /api/v1/AdminVideo/:id/views
 * @desc Increment views for a video
 * @access Public (can be called by frontend on video load)
 */
router.patch('/:id/views', async (req, res) => {
  try {
    const { id } = req.params;
    const video = await Video.findByIdAndUpdate(
      id,
      { $inc: { views: 1 } }, // Increment views by 1
      { new: true, runValidators: true } // Return the updated document
    );

    if (!video) {
      return res.status(404).json({ message: 'Video not found.' });
    }
    res
      .status(200)
      .json({ message: 'Views updated successfully', video: video });
  } catch (error) {
    console.error('Error incrementing views:', error);
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ message: 'Invalid video ID format.' });
    }
    res
      .status(500)
      .json({ message: 'Server error updating views.', error: error.message });
  }
});

module.exports = router;
