const express = require('express');

const router = express.Router();

const {
  getVerificationRequests,
  getActiveSellers,
  confirmRequest,
  getPendingRequestsCount, // Add this
  getActiveSellersCount, // Add this
  disableRequest,
  getDisableSellers,
  getRejectedSellerCount
} = require('../../../controllers/seller.controller.js');

router.get('/verification-requests/:state', getVerificationRequests);
router.get('/active-sellers', getActiveSellers);
router.get('/disable-sellers', getDisableSellers);
router.get('/rejected-seller/count', getRejectedSellerCount);
router.post('/confirm-request', confirmRequest);
router.post('/disable-request', disableRequest);

// GET /api/users/pending-requests/count
router.get('/pending-requests/count', getPendingRequestsCount);

// GET /api/users/active-sellers/count
router.get('/active-sellers/count', getActiveSellersCount);

module.exports = router;
