const { v2: cloudinary } = require('cloudinary');
const fs = require('fs');
require('dotenv').config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_SECRET_KEY
});

// Upload file to Cloudinary (video or image)
const uploadFile = async (filePath, resourceType = 'auto', folder = null) => {
  // Added folder parameter
  try {
    if (!filePath)
      throw new Error('File path is missing for Cloudinary upload.'); // Throw an error instead of returning null

    const options = {
      resource_type: resourceType
    };
    if (folder) options.folder = folder;

    const result = await cloudinary.uploader.upload(filePath, options);



    fs.unlinkSync(filePath); // Clean up local file
    return result;
  } catch (error) {
    // Ensure cleanup even if upload fails
    if (fs.existsSync(filePath)) {
      // Check if file still exists before attempting to unlink
      fs.unlinkSync(filePath);
    }
    console.error('Cloudinary upload error:', error.message);
    throw error; // Re-throw the error
  }
};

const destroyFile = async (publicId, resourceType = 'image') => {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType // 'video' or 'image'
    });
    return result;
  } catch (error) {
    console.error('Cloudinary destroy error:', error);
    throw new Error('Cloudinary file deletion failed.');
  }
};

module.exports = { uploadFile, destroyFile };
