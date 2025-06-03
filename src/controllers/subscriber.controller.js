const Subscriber = require('../models/subscriber.model.js');
const { asyncHandler } = require('../utils/asyncHandler.js');
// b92f1233e37fca6b2369ceea1764f312
module.exports.addSubscriber = asyncHandler(async (req, res) => {
  const { name, email } = req.body;
  if (!name || !email)
    return res
      .status(400)
      .json({ success: false, message: 'name and email required' });
  if (
    typeof name !== 'string' ||
    name.trim().length < 2 ||
    name.trim().length > 50
  ) {
    return res.status(400).json({
      success: false,
      message: 'Name must be a string between 2 and 50 characters.'
    });
  }
  if (typeof email !== 'string' || !/^\S+@\S+\.\S+$/.test(email)) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a valid email address.'
    });
  }
  const trimmedName = name.trim();
  const lowercasedEmail = email.toLowerCase().trim();
  const existingSubscriber = await Subscriber.findOne({
    email: lowercasedEmail
  });
  if (existingSubscriber) {
    return res.status(200).json({ message: 'You are already subscribed.' });
  }
  const newSub = Subscriber.create({
    name: trimmedName,
    email: lowercasedEmail
  });
  if (!newSub)
    return res.status(500).json({ success: false, message: 'mongoose error' });
  return res.status(201).json({ success: true, messaege: 'Created ' });
});
module.exports.getSubscriber = asyncHandler(async (req, res) => {
  try {
    const page = parseInt(req.query.page || 1);
    const limit = parseInt(req.query.limit || 10);
    const skip = (page - 1) * limit;
    const [subs, count] = await Promise.all([
      Subscriber.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Subscriber.countDocuments({})
    ]);

    const totalPages = limit > 0 ? Math.ceil(count / limit) : 0;

    res.status(200).json({
      success: true,
      count: subs.length,
      total: count,
      page,
      totalPages: totalPages,
      data: subs
    });
  } catch (error) {
    console.log(error);
  }
});
