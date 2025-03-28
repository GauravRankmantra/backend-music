const express = require("express");
const router = express.Router();
const { upload } = require('../../../middlelwares/multer.middleware.js');
const {auth} = require("../../../middlelwares/auth.middleware.js")
const playlistController = require("../../../controllers/playlist.controller.js")

router.get("/userPlaylists",auth,playlistController.getPlaylistByUserId)
router.post("/", upload.single('coverImage'),playlistController.createPlaylist)

module.exports = router;