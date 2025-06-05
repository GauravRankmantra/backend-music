const express = require('express');
const SaleController= require('../../../controllers/sales.controller.js');

const router = express.Router();

router.post('/', SaleController.createSale); // POST /api/v1/sales
router.get('/', SaleController.getAllSales); // GET /api/v1/sales
router.get('/:id', SaleController.getSaleById); // GET /api/v1/sales/:id
router.get('/user/:id',SaleController.getSaleByUserId)
router.patch('/:id', SaleController.updateSale); // PATCH /api/v1/sales/:id

module.exports = router;
