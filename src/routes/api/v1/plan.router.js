const express = require('express');
const router = express.Router();
const planController = require('../../../controllers/plan.controller');

router.post('/', planController.addPlans);

module.exports = router;
