const Album = require('../models/album.model.js'); 


const isAdminOrOwner = async (req, res, next) => {
  try {
    const user = req.user; 


    const album = await Album.findById(req.params.id);

    if (!album) {
      return res.status(404).json({ success: false, message: "Album not found" });
    }


    if (user.role === 'admin' || album.artist.equals(user._id)) {
      return next(); 
    } else {
      return res.status(403).json({ success: false, message: "Forbidden: You don't have permission to delete this album" });
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', error });
  }
};

module.exports = isAdminOrOwner;
