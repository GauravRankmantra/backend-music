const express=require("express");
const apiRoutes=require("./api/index.js");
const router=express.Router();

router.use("/api",apiRoutes);

module.exports=router;
