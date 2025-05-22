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

router.post('/changepass', auth, userController.changePassword);
router.put(
  '/update/:id',
  upload.single('coverImage'),
  userController.updateUser
);
router.get('/artist', userController.getAllArtist);

router.get('/new-users', userController.newUsers);
router.post('/addPurchaseSong', auth, userController.addPurchaseSong);
router.get('/artist/search', userController.getArtistSearch);
router.get('/search', userController.searchArtist);
router.get('/search/user', userController.searchUser);
router.get('/withdrawal', auth, userController.getWithdrawalMethod);
router.put('/withdrawal', auth, userController.addWithdrawalMethod);

router.delete('/withdrawal', auth, userController.deleteWithdrawalMethod);

router.post('/forgetPass', userController.forgetPassword);
router.post('/verifyOtp', userController.verifyOtp);
router.get('/gethistory', auth, userController.getHistory);
router.post('/addHistory', auth, userController.addHistory);
router.patch('/addVerifyReq',auth,userController.addVerifyReq)
router.post('/check-email', userController.checkEmail);
router.post('/get-otp', userController.getOtp);

router.get('/getPurchasedSong', auth, userController.getPurchasedSong);
router.get('/featuredArtists', userController.featuredArtists);
router.get('/artist:id', userController.getArtistDetail);
router.get('/getUserSongs:id', userController.getSongByUserId);

module.exports = router;
