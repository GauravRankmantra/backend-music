const express = require('express');
const router = express.Router();
const { uploadVideo } = require('../../../middlelwares/multer.middleware.js');
const { uploadFile } = require('../../../services/cloudinary.js');
const FeaturedVideo = require('../../../models/video.model.js');
const { v2: cloudinary } = require('cloudinary');
// POST /upload-video
router.post('/upload-video', uploadVideo.single('video'), async (req, res) => {
  try {
    const result = await uploadFile(req.file.path, 'video');
    if (!result) return res.status(500).json({ message: 'Upload failed' });
    const existing = await FeaturedVideo.findOne();
    if (existing) {
      // Optional: delete from Cloudinary
      await cloudinary.uploader.destroy(existing.public_id, {
        resource_type: 'video'
      });
      await existing.deleteOne();
    }
    const newVideo = new FeaturedVideo({
      url: result.secure_url,
      public_id: result.public_id,
      resource_type: result.resource_type,
      title: req.body.title || 'Featured Video'
    });

    await newVideo.save();

    res.status(200).json(newVideo);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Something went wrong' });
  }
});

router.get('/', async (req, res) => {
  const video = await FeaturedVideo.findOne();
  if (!video) return res.status(404).json({ message: 'No video found' });
  res.json(video);
});

router.delete('/', async (req, res) => {
  const video = await FeaturedVideo.findOne();
  if (!video) return res.status(404).json({ message: 'No video to delete' });

  await video.deleteOne();
  res.json({ message: 'Video deleted successfully' });
});

// PUT - update title only
router.put('/', async (req, res) => {
  const { title } = req.body;
  const video = await FeaturedVideo.findOne();
  if (!video) return res.status(404).json({ message: 'No video to update' });

  video.title = title;
  await video.save();
  res.json(video);
});

module.exports = router;
