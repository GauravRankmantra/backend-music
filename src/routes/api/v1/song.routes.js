const express = require('express');
const router = express.Router();
const songController = require('../../../controllers/song.controller.js');
const { upload } = require('../../../middlelwares/multer.middleware.js');
const { auth } = require('../../../middlelwares/auth.middleware.js');

router.post(
  '/',
  upload.fields([
    {
      name: 'high',
      maxCount: 1
    },
    {
      name: 'low',
      maxCount: 1
    },
    {
      name: 'coverImage',
      maxCount: 1
    }
  ]),
  songController.uploadSong
);
router.get('/', songController.getAllSongs);
router.get('/top15', songController.getWeeklyTop15);
router.put(
  '/:id',
  upload.single('coverImage'),
  auth,
  songController.updateSong
);
router.delete('/:id', auth, songController.deleteSong);

module.exports = router;
