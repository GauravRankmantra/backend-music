const express = require('express');
const router = express.Router();
const { makeSponsor,getSponsor } = require('../../../controllers/sponsor.controller.js');

router.post('/', makeSponsor);
router.get('/', getSponsor);

module.exports = router;
