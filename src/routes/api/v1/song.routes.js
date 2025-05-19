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
router.get('/top15', songController.top15);
router.get("/totalSongs",songController.getTotalSongs)
router.get('/weeklyTop15', songController.getWeeklyTop15);
router.post('/incresePlayCont',songController.incresePlayCont)
router.get("/songs-uploaded-this-week",songController.thisWeekTotalSongUploded)
router.get("/new-release",songController.getNewReleaseSong);
router.get('/search',songController.searchSong)
router.get('/:id',songController.getSongInfo)
router.get("/genre/:name",songController.getSongByGenre)
router.get("/isPurchased/:songId",auth,songController.isPurchased)
router.put(
  '/:id',
  upload.single('coverImage'),
  auth,
  songController.updateSong
);
router.delete('/:id', songController.deleteSong);

module.exports = router;
