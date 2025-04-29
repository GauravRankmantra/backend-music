const express = require('express');
const router = express.Router();
const homeController = require('../../../controllers/home.controller.js');
const { upload } = require('../../../middlelwares/multer.middleware.js');

router.get('/searchAll', homeController.searchAll);
router.get('/heroSection', homeController.getHeroSection);
router.put('/heroSection/:id', upload.single('coverImage'),homeController.updateHeroSection)

module.exports = router;
