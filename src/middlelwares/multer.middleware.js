const multer = require('multer');
const path = require('path');

// Image storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './public/temp');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter for videos only
const videoFileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'video/mp4',
    'video/mpeg',
    'video/webm',
    'video/ogg',
    'video/quicktime'
  ];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only video files are allowed!'), false);
  }
};

// Normal image upload
const upload = multer({ storage });

// Video upload
const uploadVideo = multer({
  storage,
  fileFilter: videoFileFilter,
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB
});

module.exports = { storage, upload, uploadVideo };
