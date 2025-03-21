const express = require('express');
const Traffic = require("../../../models/traffic.model"); // Import traffic model
const { asyncHandler } = require('../../../utils/asyncHandler'); // Custom async handler utility
const router = express.Router();

// Helper function to get today's date in 'dd MMM' format
const getToday = () => {
  const today = new Date();
  return today.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
  });
};

// Route to update and fetch traffic data
router.get('/', asyncHandler(async (req, res) => {
  const today = getToday(); // Get the current date

  // Find today's traffic data or create a new entry
  let traffic = await Traffic.findOne({ day: today });

  if (!traffic) {
    // If no entry exists for today, create a new one
    traffic = new Traffic({ day: today, totalVisits: 1 });
  } else {
    // Otherwise, increment the visit count for today
    traffic.totalVisits += 1;
  }

  // Save the updated traffic data
  await traffic.save();

  // Fetch all traffic data (you can limit results if needed)
  const trafficData = await Traffic.find().sort({ day: -1 }); // Sort by date descending

  // Respond with the updated traffic data
  res.json({ data: trafficData });
}));

module.exports = router;
