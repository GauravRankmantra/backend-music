const express = require('express');
const router = express.Router();
const albumController = require('../../../controllers/album.controller.js');
const { upload } = require('../../../middlelwares/multer.middleware.js');
const { auth } = require('../../../middlelwares/auth.middleware.js');
const isAdminOrOwner = require('../../../middlelwares/isAdminOrOwner.middleware.js');

router.get('/', albumController.getAllAlbums);
router.get('/album/search',albumController.getAlbumSearch);

router.get('/featureAlbums', albumController.getFeaturedAlbums);
router.get('/trendingAlbums',albumController.getTrendingAlbums)

router.get('/top15', albumController.getTop15);
router.get('/search',albumController.searchAlbums)
router.get("/filterAlbums",albumController.filterAlbums)

router.post('/', upload.single('coverImage'), albumController.addAlbums);

router.post('/comment', albumController.addComment);

router.put(
  '/:id',
  auth,
  upload.single('coverImage'),
  albumController.updateAlbum
);
router.get('/artistAlbums:id',auth,albumController.getArtistAlbums)

router.delete('/:id', auth, isAdminOrOwner, albumController.deleteAlbum);

router.get('/:id', albumController.getAlbumDetail);
router.get("/userAlbum/:id",albumController.getAlumByUserId)

module.exports = router;
