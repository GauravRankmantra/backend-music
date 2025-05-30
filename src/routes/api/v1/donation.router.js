const express = require('express');
const router = express.Router();
const {
  makeDonation,
  getDonation
} = require('../../../controllers/donation.controller.js');

router.post('/', makeDonation);
router.get('/', getDonation);

module.exports = router;
