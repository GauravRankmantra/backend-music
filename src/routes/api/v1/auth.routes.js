const express=require("express");
const router=express.Router();
const authController = require('../../../controllers/auth.controller.js');
const { auth,checkToken } = require("../../../middlelwares/auth.middleware.js");


router.post("/login",authController.logIn);
router.get("/",checkToken);
router.post("/logout",auth,authController.logOut);


module.exports=router;