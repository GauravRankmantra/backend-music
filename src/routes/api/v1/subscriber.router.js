const express = require('express');
const router = express.Router();
const subscriber = require('../../../controllers/subscriber.controller.js');

router.get('/', subscriber.getSubscriber);
router.post('/', subscriber.addSubscriber);

module.exports = router;
