const express = require('express');
const Traffic = require('../../../models/traffic.model'); // Import traffic model
const { asyncHandler } = require('../../../utils/asyncHandler'); // Custom async handler utility
const router = express.Router();

// Helper function to get today's date in 'dd MMM' format
const getToday = () => {
  const today = new Date();
  return today.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
  });
};

// Route to handle traffic
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const today = getToday(); // Get today's date in 'dd MMM' format

    try {
      // Find the traffic data for today
      let traffic = await Traffic.findOne({ day: today });

      // If no record exists for today, create a new record with totalVisits = 1
      if (!traffic) {
        traffic = new Traffic({ day: today, totalVisits: 1 });
      } else {
        // Increment the totalVisits if record already exists
        traffic.totalVisits += 1;
      }

      // Save the updated traffic data
      await traffic.save();

      // Fetch all traffic data sorted by day (most recent first)
      const trafficData = await Traffic.find().sort({ day: -1 });

      // Send the traffic data as a response
      res.status(200).json({ data: trafficData });
    } catch (error) {
      console.error('Error saving traffic data:', error);
      res.status(500).json({ message: 'Internal server error', error });
    }
  })
);

module.exports = router;
