const { v2: cloudinary } = require('cloudinary');
require('dotenv').config();
const fs = require('fs');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_SECRET_KEY
});

//upload file
const uploadFile = async (filePath) => {
  // console.log('filePath', filePath);
  try {
    if (!filePath) return null;
    const fileUrl = await cloudinary.uploader.upload(filePath, {
      resource_type: 'auto'
    });
    fs.unlinkSync(filePath);
    // console.log('fileUrl', fileUrl);
    return fileUrl;
  } catch (error) {
    fs.unlinkSync(filePath);
    return null;
  }
};

module.exports = { uploadFile };
