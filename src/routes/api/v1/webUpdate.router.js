const express = require('express');
const router = express.Router();
const WebUpdateController=require("../../../controllers/webUpdata.controller.js")

router.get('/', WebUpdateController.getAllWebUpdates);
router.post('/',WebUpdateController.addWebUpdate)
router.put("/:id",WebUpdateController.updateWebUpdate)
router.delete('/:id',WebUpdateController.deleteWebUpdate)


module.exports = router;