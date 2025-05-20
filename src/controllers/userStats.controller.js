const { asyncHandler } = require('../utils/asyncHandler.js');
const UserStats = require('../models/userStats.model.js');
const mongoose = require('mongoose');
const Song = require('../models/song.model.js');

function getUTCDateOnly(date = new Date()) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
}

const updateUserStatsField = async (artistIds, field, value = 1) => {
  const todayUTC = getUTCDateOnly();

  const results = await Promise.all(
    artistIds.map(async (id) => {
      if (!mongoose.Types.ObjectId.isValid(id)) return null;

      const filter = { user: id, date: todayUTC };
      const update = {
        $inc: { [field]: value },
        $setOnInsert: { user: id, date: todayUTC }
      };
      const opts = { upsert: true, new: true };

      const doc = await UserStats.findOneAndUpdate(filter, update, opts);
      return { artistId: id, status: doc.wasNew ? 'created' : 'incremented' };
    })
  );

  return results.filter(Boolean);
};

module.exports.getUserStats = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { filter = 'weekly' } = req.query;

  if (!id) {
    return res.status(400)
      .json({ success: false, message: 'Invalid or missing user ID' });
  }

  // compute UTC‐only boundaries
  const endUTC = getUTCDateOnly();
  let startUTC = null;

  switch (filter) {
    case 'weekly':
      startUTC = new Date(endUTC);
      startUTC.setUTCDate(endUTC.getUTCDate() - 6);
      break;
    case 'monthly':
      startUTC = new Date(endUTC);
      startUTC.setUTCDate(endUTC.getUTCDate() - 29);
      break;
    case 'all':
      break;
    default:
      return res.status(400)
        .json({ success: false, message: 'Invalid filter value' });
  }

  // build match
  const match = { user: new mongoose.Types.ObjectId(id) };
  if (startUTC) match.date = { $gte: startUTC, $lte: endUTC };

  // aggregate by date string
  const stats = await UserStats.aggregate([
    { $match: match },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
        downloads: { $sum: '$downloads' },
        purchases: { $sum: '$purchases' },
        revenue: { $sum: '$revenue' },
      }
    },
    { $sort: { '_id': 1 } }
  ]);

  if (!stats.length) {
    return res.status(404)
      .json({ success: false, data: [], message: 'No data available' });
  }

  res.json({ success: true, data: stats });
});


module.exports.addDownloadStats = asyncHandler(async (req, res) => {
  const { artistIds } = req.body;
  if (!Array.isArray(artistIds) || artistIds.length === 0) {
    return res.status(400)
      .json({ success: false, message: 'artistIds array is required' });
  }
  const results = await updateUserStatsField(artistIds, 'downloads', 1);
  res.json({ success: true, message: 'Download stats updated', results });
});

module.exports.addPurchaseStats = asyncHandler(async (req, res) => {
  const { artistIds } = req.body;
  if (!Array.isArray(artistIds) || artistIds.length === 0) {
    return res.status(400)
      .json({ success: false, message: 'artistIds array is required' });
  }
  const results = await updateUserStatsField(artistIds, 'purchases', 1);
  res.json({ success: true, message: 'Purchase stats updated', results });
});

module.exports.addRevenueStats = asyncHandler(async (req, res) => {
  const { artistIds, price } = req.body;
  if (!Array.isArray(artistIds) || artistIds.length === 0) {
    return res.status(400)
      .json({ success: false, message: 'artistIds array is required' });
  }
  if (typeof price !== 'number' || price <= 0) {
    return res.status(400)
      .json({ success: false, message: 'Valid numeric price is required' });
  }
  const results = await updateUserStatsField(artistIds, 'revenue', price);
  res.json({ success: true, message: 'Revenue stats updated', results });
});
