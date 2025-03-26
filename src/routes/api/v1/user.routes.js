const express = require('express');
const router = express.Router();
const userController = require('../../../controllers/user.controller.js');
const { upload } = require('../../../middlelwares/multer.middleware.js');
const { auth } = require('../../../middlelwares/auth.middleware.js');

router.post(
  '/',
  upload.fields([
    {
      name: 'avatar',
      maxCount: 1
    },
    {
      name: 'coverImage',
      maxCount: 1
    }
  ]),
  userController.registerUser
);

router.patch('/changepass', auth, userController.changePassword);
router.put(
  '/update',
  auth,
  upload.single('coverImage'),
  userController.updateUser
);
router.get('/artist', userController.getAllArtist);

router.get('/new-users',userController.newUsers)
router.get('/artist/search',userController.getArtistSearch);
router.post('/forgetPass', userController.forgetPassword);
router.post('/verifyOtp', userController.verifyOtp);
router.get("/getPurchasedSong",auth,userController.getPurchasedSong)
router.get('/featuredArtists', userController.featuredArtists);
router.get('/artist:id',userController.getArtistDetail)

module.exports = router;
