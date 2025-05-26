const express = require('express');
const router = express.Router();
const {
  uploadVideo,
  upload
} = require('../../../middlelwares/multer.middleware.js'); // Assuming this path is correct
const { uploadFile, destroyFile } = require('../../../services/cloudinary.js'); // Assuming this path is correct
const Video = require('../../../models/video.model.js'); // Updated model name
const { v2: cloudinary } = require('cloudinary'); // Ensure cloudinary is configured globally or passed via services

const imageFileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp'
  ];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        'Only image files (JPG, PNG, GIF, WebP) are allowed for thumbnail!'
      ),
      false
    );
  }
};

// Custom file filter for videos
const videoFileFilterForRoute = (req, file, cb) => {
  const allowedMimeTypes = [
    'video/mp4',
    'video/mpeg',
    'video/webm',
    'video/ogg',
    'video/quicktime'
  ];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        'Only video files (MP4, MPEG, WebM, OGG, Quicktime) are allowed for video!'
      ),
      false
    );
  }
};

router.post(
  '/',
  upload.fields([
    // Use the 'upload' instance which only defines storage
    { name: 'video', maxCount: 1, fileFilter: videoFileFilterForRoute }, // Apply video filter here
    { name: 'thumbnail', maxCount: 1, fileFilter: imageFileFilter } // Apply image filter here
  ]),
  async (req, res) => {
    // Ensure both files exist from req.files
    const videoFile = req.files['video'] ? req.files['video'][0] : null;
    const thumbnailFile = req.files['thumbnail']
      ? req.files['thumbnail'][0]
      : null;

    // To track uploaded Cloudinary resources for cleanup
    let uploadedCloudinaryVideoId = null;
    let uploadedCloudinaryThumbnailId = null;
    let videoLocalPath = videoFile ? videoFile.path : null;
    let thumbnailLocalPath = thumbnailFile ? thumbnailFile.path : null;

    try {
      const { title, description } = req.body;

      // --- Input Validation ---
      if (!videoFile) {
        return res.status(400).json({ message: 'Video file is required.' });
      }
      if (!thumbnailFile) {
        return res.status(400).json({ message: 'Thumbnail file is required.' });
      }
      if (!title || title.trim().length < 3) {
        return res.status(400).json({
          message:
            'Video title is required and must be at least 3 characters long.'
        });
      }

      // --- Cloudinary Uploads ---
      let videoUploadResult;
      let thumbnailUploadResult;

      try {
        videoUploadResult = await uploadFile(
          videoLocalPath,
          'video',
          'odg-videos'
        );
        uploadedCloudinaryVideoId = videoUploadResult.public_id; // Store for potential cleanup

        thumbnailUploadResult = await uploadFile(
          thumbnailLocalPath,
          'image',
          'odg-thumbnails'
        );
        uploadedCloudinaryThumbnailId = thumbnailUploadResult.public_id; // Store for potential cleanup
      } catch (uploadError) {
        // If either upload fails, clean up whatever *was* uploaded to Cloudinary
        console.error(
          'Cloudinary upload error during video/thumbnail processing:',
          uploadError
        );
        if (uploadedCloudinaryVideoId) {
          await destroyFile(uploadedCloudinaryVideoId, 'video').catch((e) =>
            console.error('Failed to cleanup video on Cloudinary:', e.message)
          );
        }
        if (uploadedCloudinaryThumbnailId) {
          await destroyFile(uploadedCloudinaryThumbnailId, 'image').catch((e) =>
            console.error(
              'Failed to cleanup thumbnail on Cloudinary:',
              e.message
            )
          );
        }
        // The `uploadFile` function already handles local file cleanup
        return res
          .status(500)
          .json({
            message:
              uploadError.message || 'Error during file upload to Cloudinary.'
          });
      }

      // --- Create New Video Document ---
      const newVideo = new Video({
        title: title.trim(),
        description: description ? description.trim() : '',
        url: videoUploadResult.secure_url,
        public_id: videoUploadResult.public_id,
        resource_type: videoUploadResult.resource_type,
        thumbnailUrl: thumbnailUploadResult.secure_url,
        thumbnailPublicId: thumbnailUploadResult.public_id,
        views: 0
        // owner: req.user.id, // Uncomment if you have user authentication
      });

      await newVideo.save();

      res.status(201).json({
        message: 'Video and thumbnail uploaded successfully!',
        video: newVideo
      });
    } catch (error) {
      console.error('Server error during video upload process:', error);
      // At this point, `uploadFile` has already cleaned up local temp files.
      // If error is here (e.g., Mongoose save failure), Cloudinary files might be orphaned.
      // You might consider adding a more robust rollback/cleanup mechanism here
      // if database write failures are common after successful Cloudinary uploads.
      res.status(500).json({
        message: 'Server error during video upload.',
        error: error.message
      });
    }
  }
);

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

// Ensure uploadVideo is correctly configured for Multer
// For example:
// const multer = require('multer');
// const storage = multer.diskStorage({ destination: '/tmp/', filename: (req, file, cb) => { cb(null, file.originalname); } });
// const uploadVideo = multer({ storage: storage });

// Assuming 'uploadVideo' is your multer instance setup

// Assuming you have these Cloudinary helper functions:
// const { uploadFile, destroyFile } = require('../utils/cloudinary'); // Adjust path as needed

router.put(
  '/:id',
  // Use .fields() to accept both 'video' and 'thumbnail' files
  upload.fields([
    { name: 'video', maxCount: 1, fileFilter: videoFileFilterForRoute }, // Apply video filter here
    { name: 'thumbnail', maxCount: 1, fileFilter: imageFileFilter } // Apply image filter here
  ]),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { title, description } = req.body;

      // Extract uploaded files (they will be in arrays if found)
  const videoFile = req.files['video'] ? req.files['video'][0] : null;
    const thumbnailFile = req.files['thumbnail']
      ? req.files['thumbnail'][0]
      : null;


      // Basic validation for title
      if (title && title.trim().length < 3) {
        return res.status(400).json({
          message: 'Video title must be at least 3 characters long if provided.'
        });
      }

      let video = await Video.findById(id); // Assuming 'Video' is your Mongoose model
      if (!video) {
        return res.status(404).json({ message: 'Video not found.' });
      }

      // Update title and description if provided
      if (title) video.title = title.trim();
      if (description) video.description = description.trim();

      // If a new video file is provided, upload it and replace the old one
      if (videoFile) {
        // Delete old video from Cloudinary
        if (video.public_id) {
          // This should be the public_id for the video file itself
          await destroyFile(video.public_id, 'video'); // Specify resource_type 'video'
        }

        // Upload new video to Cloudinary
        const result = await uploadFile(videoFile.path, 'video', 'videos'); // Specify resource_type 'video' and folder
        if (!result) {
          return res
            .status(500)
            .json({ message: 'New video file upload to Cloudinary failed.' });
        }
        video.url = result.secure_url;
        video.public_id = result.public_id;
        video.resource_type = result.resource_type;
      }

      // --- NEW: If a new thumbnail file is provided, upload it and replace the old one ---
      if (thumbnailFile) {
        // Delete old thumbnail from Cloudinary
        if (video.thumbnail_public_id) {
          // Assuming you store thumbnail public_id separately
          await destroyFile(video.thumbnail_public_id, 'image'); // Specify resource_type 'image'
        }

        // Upload new thumbnail to Cloudinary
        const thumbnailResult = await uploadFile(
          thumbnailFile.path,
          'image',
          'thumbnails'
        ); // Specify resource_type 'image' and a 'thumbnails' folder
        if (!thumbnailResult) {
          return res
            .status(500)
            .json({
              message: 'New thumbnail file upload to Cloudinary failed.'
            });
        }
        video.thumbnailUrl = thumbnailResult.secure_url; // Assuming your schema has this field
        
      }
      // --- END NEW THUMBNAIL LOGIC ---

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
        .json({
          message: 'Server error updating video.',
          error: error.message
        });
    }
  }
);
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
