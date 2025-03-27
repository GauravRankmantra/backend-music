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
        const email = profile.emails ? profile.emails[0].value : null;

        // Step 1: Check if user exists by googleId
        let user = await User.findOne({ googleId: profile.id });

        if (user) {
          // If user already exists with googleId, authenticate and log them in
          return done(null, user);
        }

        // Step 2: Check if user exists by email
        if (email) {
          user = await User.findOne({ email });

          if (user) {
            // If user exists by email, update their googleId and authenticate
            user.googleId = profile.id; // Update their Google ID if it wasn't saved before
            await user.save();
            return done(null, user);
          }
        }

        // Step 3: Create a new user if no user found by googleId or email
        const newUser = new User({
          fullName: profile.displayName,
          email: email, // Use email if available
          googleId: profile.id,
          coverImage: profile.photos ? profile.photos[0].value : null, // Use Google profile picture if available
        });

        const savedUser = await newUser.save();
        return done(null, savedUser); // Authenticate the new user
      } catch (err) {
        return done(err, false); // Handle any errors
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
