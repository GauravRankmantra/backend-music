const express = require("express");
const router = express.Router();
const userController = require("../../../controllers/user.controller.js");

//all user action's
router.get("/users",userController.getAllUsers)
router.get("/artist",userController.getAllArtist)
router.get("/searchUser",userController.searchUser)


router.put("/user/:id", userController.updateUser2); 
router.delete("/user/:id",userController.deleteUser)


//all album action's


module.exports = router;