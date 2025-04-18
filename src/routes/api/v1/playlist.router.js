const express = require("express");
const router = express.Router();
const { upload } = require('../../../middlelwares/multer.middleware.js');
const {auth} = require("../../../middlelwares/auth.middleware.js")
const playlistController = require("../../../controllers/playlist.controller.js")

router.get("/userPlaylists",auth,playlistController.getPlaylistByUserId)

router.get("/getTopPlaylist",playlistController.getTopPlaylist)
router.get("/:id",playlistController.getPlaylistById)
router.post("/",auth, upload.single('coverImage'),playlistController.createPlaylist)
router.post("/singlSong",playlistController.addSongToPlaylist)
router.delete("/delete:playlistId",auth,playlistController.deletePlaylist)

module.exports = router;