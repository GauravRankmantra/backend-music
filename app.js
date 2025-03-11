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
  'http://localhost:3000',

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
  


//import routes
const apiRoutes=require("./src/routes/index.js")

app.use("/",apiRoutes);

module.exports = { app };
