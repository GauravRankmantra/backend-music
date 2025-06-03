const express = require('express');
require('./src/services/googleAuth.js'); 
require('./src/services/facebookAuth.js')
const passport = require('passport');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const cors = require('cors');
const ejs = require('ejs');
const path = require('path');


const app = express();

//middlewares
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true })); 
app.use(session({
  secret: process.env.SESSION_SECRET || 'hextocode', 
  resave: false, 
  saveUninitialized: false, 
  cookie: {
    secure: process.env.NODE_ENV === 'production',  
    httpOnly: true,
    sameSite: "none",
    maxAge: 24 * 60 * 60 * 1000 
  }
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static('public'));

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

const allowedDomains = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:3000',
  'https://odgmusic.com',
  'https://odgmusic.com/admin',
  'https://odgmusic.com/admin/forms/basic-form',
  'https://odgmusic.netlify.app',
  'https://adminpanelmusic.netlify.app'
  
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin, like mobile apps or curl requests
      if (!origin || allowedDomains.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: 'GET, POST, PUT, DELETE, PATCH',
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Access-Control-Allow-Credentials'
    ],

    credentials: true
  })
);

app.use('/server/health', (req, res) => {
  res.send({ success: true, message: 'Server is running..' });
});



//import routes
const apiRoutes = require('./src/routes/index.js');

app.use('/', apiRoutes);

module.exports = { app };
