const express=require("express");
const router=express.Router();
const genreController = require('../../../controllers/genre.controller.js');
const { upload } = require('../../../middlelwares/multer.middleware.js');

router.get("/",genreController.getGenre);
router.get("/:id",genreController.getGenreById)
router.post("/",upload.single('image'),genreController.uploadGenre);
router.put("/:id", upload.single("image"), genreController.updateGenre);
router.delete("/:id",genreController.deleteGenre)



module.exports=router;