const express = require("express");
const likeController = require("../../../controllers/like.controller.js");
const { auth } = require("../../../middlelwares/auth.middleware");
const router = express.Router();


router.get("/",auth,likeController.getUserLikedSongs)
router.post("/",auth,likeController.addLike)
router.delete("/",auth,likeController.removeLike)


module.exports = router;