const express = require('express');
const router = express.Router();
const {
  getFooter,
  updateFooter,
  deleteFooter
} = require('../../../controllers/footer.controller.js');

router.get('/', getFooter);
router.put('/:id', updateFooter);
router.delete('/', deleteFooter);
module.exports = router;
