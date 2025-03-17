const express=require("express");
const router=express.Router();

const userRouter=require("./user.routes.js")
const authRouter=require("./auth.routes.js")
const songRouter = require("./song.routes.js")
const genreRouter = require("./genre.route.js")
const albumRouter=require("./album.router.js")
const planRouter=require("./plan.router.js")
// const adminRouter = require("./admin.router.js")
const adminRouter = require("./admin.router.js")
let trafficData = {};

// Function to get today's date in 'dd MMM' format (e.g., '01 Jan')
const getToday = () => {
  const today = new Date();
  return today.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
  });
};

// Middleware to track visits
router.use((req, res, next) => {
  const today = getToday();
  // Initialize or increment the visit count for today
  if (!trafficData[today]) {
    trafficData[today] = { day: today, totalVisits: 1 };
  } else {
    trafficData[today].totalVisits += 1;
  }
  next();
});

// API route to get traffic data
router.use("/traffic", (req, res) => {
  // Return the traffic data as an array sorted by date
  const sortedTrafficData = Object.values(trafficData).sort(
    (a, b) => new Date(b.day) - new Date(a.day)
  );
  res.json({ data: sortedTrafficData });
});


router.use("/user",userRouter)
router.use("/auth",authRouter)
router.use("/song",songRouter)
router.use("/genre",genreRouter)
router.use("/albums",albumRouter)
router.use("/plan",planRouter)
router.use("/admin",adminRouter)

module.exports=router;