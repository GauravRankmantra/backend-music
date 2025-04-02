const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/user.model.js'); 

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.BACKEND_URL + '/api/v1/auth/google/callback',
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails && profile.emails.length > 0 ? profile.emails[0].value : null;
        if (!email) {
          return done(new Error("Google login failed: No email found"), false);
        }

        // Step 1: Check if user exists by googleId
        let user = await User.findOne({ googleId: profile.id });

        if (user) {
          return done(null, user);
        }

        // Step 2: Check if user exists by email
        user = await User.findOne({ email });

        if (user) {
          // If user exists but has no Google ID, link it
          if (!user.googleId) {
            user.googleId = profile.id;
            await user.save();
          }
          return done(null, user);
        }

        // Step 3: Create a new user if no user found
        const newUser = new User({
          fullName: profile.displayName,
          email: email,
          googleId: profile.id,
          coverImage: profile.photos ? profile.photos[0].value : null,
        });

        const savedUser = await newUser.save();
        return done(null, savedUser);
      } catch (err) {
        return done(err, false);
      }
    }
  )
);

// Serialize and deserialize user
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  User.findById(id, (err, user) => {
    done(err, user);
  });
});
