const Plan = require('../models/plan.model');
const { asyncHandler } = require('../utils/asyncHandler');

module.exports.addPlans = asyncHandler(async (req, res) => {
  const { name, uplodeLimit, downloadLimit, planValidity, streaming, price } =
    req.body;
  try {
    const plan = await Plan.create({
      name,
      uplodeLimit,
      downloadLimit,
      planValidity,
      streaming,
      price
    });
    return res.status(200).json(plan);
  } catch (error) {
    return res.status(400).json({ message: 'error', error });
  }
});
