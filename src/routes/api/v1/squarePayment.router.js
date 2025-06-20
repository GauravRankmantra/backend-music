const express = require("express");
const router = express.Router();
const { submitSquarePayment } = require("../../../controllers/squarePayment.controller");

// Square Payment Route
router.post("/submitSquarePayment", submitSquarePayment );
// router.get('/verify-transaction', verifySquareTransaction);

module.exports = router;
