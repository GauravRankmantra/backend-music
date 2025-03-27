const express = require('express');
const passport = require('passport');
const router = express.Router();
const authController = require('../../../controllers/auth.controller.js');
const generateTokens = async (user, res) => {
  try {
    const accessToken = await user.generateAccessToken();
    const refreshToken = await user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    res.status(500).send({
      success: false,
      message: 'Something went wrong'
    });
  }
};
const {
  auth,
  checkToken
} = require('../../../middlelwares/auth.middleware.js');

router.post('/login', authController.logIn);
router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);
router.get(
  '/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  async (req, res) => {
    // Successful Google login, generate JWT tokens
    const { accessToken, refreshToken } = await generateTokens(req.user, res);

    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 24 * 60 * 60 * 1000
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.redirect('https://odgmusic.netlify.app/Oauth');
  }
);

// Facebook login route
router.get(
  '/facebook',
  passport.authenticate('facebook', { scope: ['email'] })
);

// Facebook callback route
router.get(
  '/facebook/callback',
  passport.authenticate('facebook', {
    failureRedirect: `${process.env.FRONTEND_URL}/login`
  }),
  async (req, res) => {
    // Redirect to the frontend profile page with user info
    const { accessToken, refreshToken } = await generateTokens(req.user, res);

    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 24 * 60 * 60 * 1000
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });
    res.redirect('https://odgmusic.netlify.app/Oauth');
    //   `${process.env.FRONTEND_URL}/profile?userId=${req.user._id}&name=${encodeURIComponent(req.user.fullName)}`
  }
);

router.get('/', checkToken);
router.get('/profile', auth, authController.getUserProfile);
router.post('/logout', auth, authController.logOut);

module.exports = router;
