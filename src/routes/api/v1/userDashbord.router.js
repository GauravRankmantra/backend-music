const express = require('express');
const router = express.Router();
const userDashbordController = require('../../../controllers/userDashbord.controller.js');
const { upload } = require('../../../middlelwares/multer.middleware.js');
const { auth } = require('../../../middlelwares/auth.middleware.js');

router.get('/getDashbordInfo', auth, userDashbordController.getDashbordInfo);
router.get('/getWeeklyActivityStats',auth,userDashbordController.getWeeklyActivityStats)

router.post('/activity', userDashbordController.addActivity);

module.exports = router;
