const express = require('express');
const router = express.Router();
const albumController = require('../../../controllers/album.controller.js');
const { upload } = require('../../../middlelwares/multer.middleware.js');
const { auth } = require('../../../middlelwares/auth.middleware.js');
const isAdminOrOwner = require('../../../middlelwares/isAdminOrOwner.middleware.js');

router.get('/', albumController.getAllAlbums);

router.get('/featureAlbums', albumController.getFeaturedAlbums);

router.get('/top15', albumController.getTop15);

router.post('/', upload.single('coverImage'), albumController.addAlbums);

router.post('/comment', albumController.addComment);

router.put(
  '/:id',
  auth,
  upload.single('coverImage'),
  albumController.updateAlbum
);

router.delete('/:id', auth, isAdminOrOwner, albumController.deleteAlbum);

router.get('/:id', albumController.getAlbumDetail);

module.exports = router;
