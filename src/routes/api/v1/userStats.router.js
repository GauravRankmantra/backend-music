const express= require("express")
const router = express.Router();
const UserStateController = require("../../../controllers/userStats.controller.js")

router.get("/stats/:id",UserStateController.getUserStats)
router.post("/addDownloadStats",UserStateController.addDownloadStats)
router.post("/addPurchaseStats",UserStateController.addPurchaseStats)
router.post("/addRevenueStats",UserStateController.addRevenueStats)


module.exports=router