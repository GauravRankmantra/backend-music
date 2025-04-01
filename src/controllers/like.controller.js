const Like = require("../models/like.model.js")
const {asyncHandler} = require("../utils/asyncHandler.js")
const mongoose = require("mongoose")
const Song = require("../models/song.model.js")

module.exports.addLike = asyncHandler(async (req, res) => {
    const { songId, albumId } = req.body;
    const likedBy = req.user?._id;
  
    if (!songId && !albumId) {
      return res.status(400).json({ message: 'Either Song ID or Album ID is required' });
    }
  
    try {
      let existingLike;
      let likeData = { likedBy };
  
      if (songId) {
        existingLike = await Like.findOne({ likedBy, song: songId });
        likeData.song = songId;
      } else if (albumId) {
        existingLike = await Like.findOne({ likedBy, album: albumId });
        likeData.album = albumId;
      }
  
      if (existingLike) {
        return res.status(400).json({ message: 'Already liked' });
      }
  
      const like = await Like.create(likeData);
  
      res.status(201).json({
        success: true,
        message: `${songId ? 'Song' : 'Album'} liked successfully`,
        data: like,
      });
    } catch (error) {
      console.error('Error adding like:', error);
      res.status(500).json({ message: 'Internal server error', error: error.message });
    }
  });
  
  module.exports.removeLike = asyncHandler(async (req, res) => {
    const { songId } = req.body;
    const likedBy = req.user?._id;
  
    if (!songId) {
      return res.status(400).json({ message: 'Song ID is required' });
    }
  
    try {
      const like = await Like.findOneAndDelete({ likedBy, song: songId });
  
      if (!like) {
        return res.status(404).json({ message: 'Like not found' });
      }
  
      res.status(200).json({
        success: true,
        message: 'Like removed successfully',
      });
    } catch (error) {
      console.error('Error removing like:', error);
      res.status(500).json({ message: 'Internal server error', error: error.message });
    }
  });
  
  module.exports.getUserLikedSongs = asyncHandler(async (req, res) => {
    const likedBy = req.user?._id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
  
    try {
      const likedSongs = await Like.aggregate([
        { $match: { likedBy: new mongoose.Types.ObjectId(likedBy) } },
  
        // Join with the "songs" collection
        {
          $lookup: {
            from: "songs",
            localField: "song",
            foreignField: "_id",
            as: "song",
          },
        },
        { $unwind: "$song" }, // Convert array into a single object
  
        // Join with the "users" collection (for artist details)
        {
          $lookup: {
            from: "users",
            localField: "song.artist",
            foreignField: "_id",
            as: "song.artist",
          },
        },
        { $unwind: "$song.artist" }, // Convert artist array into a single object
  
        // Final structure projection
        {
          $project: {
            _id: "$song._id",
            title: "$song.title",
            coverImage: "$song.coverImage",
            audioUrls: "$song.audioUrls",
            duration: "$song.duration",
            artist: {
              _id: "$song.artist._id",
              fullName: "$song.artist.fullName",
              coverImage: "$song.artist.coverImage",
            },
            createdAt: 1,
          },
        },
  
        { $sort: { createdAt: -1 } }, // Sort by newest first
        { $skip: skip },
        { $limit: limit },
      ]);
  
      // Count total liked songs
      const totalLikes = await Like.countDocuments({ likedBy });
  
      res.status(200).json({
        success: true,
        data: likedSongs, // Returning an array of songs
        totalPages: Math.ceil(totalLikes / limit),
        currentPage: page,
      });
    } catch (error) {
      console.error("Error getting liked songs:", error);
      res.status(500).json({ message: "Internal server error", error: error.message });
    }
  });
  
  module.exports.getSongLikesCount = asyncHandler(async(req, res)=>{
      const {songId} = req.params;
  
      if(!songId){
          return res.status(400).json({message: "Song ID is required"})
      }
  
      try{
          const likeCount = await Like.countDocuments({song: songId});
          res.status(200).json({
              success: true,
              data: {count: likeCount}
          })
      }catch(error){
          console.error("Error getting like count:", error);
          res.status(500).json({message: "Internal server error", error: error.message});
      }
  })