const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const app = express();

//middlewares
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true })); //data which is coming from url
app.use(express.static('public'));
const allowedDomains = [
  'http://localhost:5173',
  'http://localhost:5175',
  'http://localhost:3000',
  'https://cosmic-narwhal-6b8ed5.netlify.app',
  'https://funny-shortbread-aa9177.netlify.app',
  'https://adminpanelmusic.netlify.app',
  'https://fantastic-sfogliatella-b432ab.netlify.app'
];

// Middleware setup
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedDomains.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: 'GET, POST, PUT, DELETE,PATCH',
    allowedHeaders: 'Content-Type, Authorization',
    credentials: true // Allow credentials (cookies, etc.)
  })
);
app.use('/server/health', (req, res) => {
  res.send({ success: true, message: 'Server is running..' });
});

//import routes
const apiRoutes = require('./src/routes/index.js');

app.use('/', apiRoutes);

module.exports = { app };
