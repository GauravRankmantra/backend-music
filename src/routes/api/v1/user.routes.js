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
router.patch('/forgetPass', auth, userController.forgetPassword);
router.patch('/verifyOtp', auth, userController.verifyOtp);
router.get('/featuredArtists', userController.featuredArtists);

module.exports = router;
