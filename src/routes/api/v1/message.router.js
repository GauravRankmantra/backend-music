const express = require("express");
const router = express.Router();
const messageController = require("../../../controllers/message.controller.js");
// const { auth } = require('../../../middlelwares/auth.middleware.js');

router.get("/users", messageController.getActiveUsers);

router.get("/messages/:userId", messageController.getMessagesByUser);

router.post("/messages/user", messageController.createUserMessage);

router.post("/messages/admin", messageController.createAdminReply);
router.put("/messages/:messageId", messageController.updateMessage);

router.delete("/messages/:messageId", messageController.deleteMessage);

module.exports = router;
