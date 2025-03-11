const express=require("express");
const router=express.Router();
const genreController = require('../../../controllers/genre.controller.js');

router.get("/",genreController.getGenre);
router.post("/",genreController.bulkUploadGenres);



module.exports=router;