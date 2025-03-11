const express=require("express");
const router=express.Router();
const authController = require('../../../controllers/auth.controller.js');
const { auth } = require("../../../middlelwares/auth.middleware.js");


router.post("/login",authController.logIn);
router.post("/logout",auth,authController.logOut);


module.exports=router;