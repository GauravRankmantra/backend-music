const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const app = express();

//middlewares
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true })); //data which is coming from url
app.use(express.static('public'));
app.use(cors({
    origin: 'http://localhost:5173/', 
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true, 
  }));


//import routes
const apiRoutes=require("./src/routes/index.js")

app.use("/",apiRoutes);

module.exports = { app };
