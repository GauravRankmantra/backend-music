const Traffic = require('../models/traffic.model.js');
const moment = require("moment")

module.exports.logTraffic = async (req, res) => {
  try {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    await Traffic.create({ ip, userAgent });
    res.status(200).json({ success: true, message: 'Logged' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to log visit' });
  }
};

module.exports.getTrafficStats = async (req, res) => {
  try {
    const { range = 'week' } = req.query;

    let startDate = null;

    if (range === 'week') {
      startDate = moment().subtract(7, 'days').startOf('day').toDate();
    } else if (range === 'month') {
      startDate = moment().subtract(1, 'months').startOf('day').toDate();
    }

    // Build match condition
    const match = startDate ? { createdAt: { $gte: startDate } } : {};

    const traffic = await Traffic.aggregate([
      { $match: match },
      {
        $group: {
          _id: {
            $dateToString: { format: '%d %b', date: '$createdAt' }
          },
          totalVisits: { $sum: 1 }
        }
      },
      {
        $project: {
          day: '$_id',
          totalVisits: 1,
          _id: 0
        }
      },
      {
        $sort: {
          day: 1
        }
      }
    ]);

    res.status(200).json({ success: true, data: traffic });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ success: false, message: 'Failed to fetch traffic stats' });
  }
};
