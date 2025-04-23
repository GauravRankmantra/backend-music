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



router.get(
  '/',
  asyncHandler(async (req, res) => {
    try {
      const today = moment().startOf('day');
      const lastWeek = moment().subtract(6, 'days').startOf('day');

      const trafficData = await Traffic.find({
        dayDate: { $gte: lastWeek.toDate(), $lte: today.toDate() },
      }).sort({ dayDate: 1 }); // Ascending order for charting

      console.log("trafficData",trafficData)

      res.status(200).json({ data: trafficData });
    } catch (error) {
      console.error('Error fetching traffic data:', error);
      res.status(500).json({ message: 'Internal server error', error });
    }
  })
);




router.post(
  '/',
  asyncHandler(async (req, res) => {
    const today = moment().format('YYYY-MM-DD'); // use ISO format for consistency

    try {
      let traffic = await Traffic.findOne({ day: today });

      if (!traffic) {
        traffic = new Traffic({ day: today, totalVisits: 1 });
      } else {
        traffic.totalVisits += 1;
      }

      await traffic.save();

      res.status(200).json({ success: true, message: 'Traffic updated.' });
    } catch (error) {
      console.error('Error updating traffic:', error);
      res.status(500).json({ success: false, message: 'Failed to update traffic' });
    }
  })
);


module.exports = router;
