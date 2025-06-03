const express = require('express');
const Traffic = require('../../../models/traffic.model.js'); // Import traffic model

const router = express.Router();
const trafficController =require("../../../controllers/traffic.controller.js")

// Helper function to get today's date in 'dd MMM' format
router.get('/', trafficController.getTrafficStats);
router.post('/log', trafficController.logTraffic);


router.post('/dummy', async (req, res) => {

  try {
 
    const { ip, userAgent, createdAt } = req.body;
    await Traffic.create({ ip, userAgent, createdAt });
    res.status(200).json({ success: true, message: 'Dummy traffic logged' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error logging dummy traffic',error:err });
  }
});



module.exports = router;
