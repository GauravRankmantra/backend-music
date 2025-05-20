const { v2: cloudinary } = require('cloudinary');
const fs = require('fs');
require('dotenv').config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_SECRET_KEY
});

// Upload file to Cloudinary (video or image)
const uploadFile = async (filePath, resourceType = 'auto') => {
  try {
    if (!filePath) return null;

    const result = await cloudinary.uploader.upload(filePath, {
      resource_type: resourceType // 'video' or 'auto'
    });

    fs.unlinkSync(filePath); // Clean up local file
    return result;
  } catch (error) {
    fs.unlinkSync(filePath);
    console.error('Cloudinary upload error:', error.message);
    return null;
  }
};

module.exports = { uploadFile };
