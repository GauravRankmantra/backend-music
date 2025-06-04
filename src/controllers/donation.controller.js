const Donation = require('../models/donation.model.js');
const Stripe = require('stripe');
const stripe = new Stripe(
  'sk_test_51ATmKHDDS4z6YL4JHf7lHAlud5gERC8DhJDj316h9IR87kYUCoA7YuRShrzVHgtyJ618spYGmYJVYsWGog6rbuYq00mDBiEJko'
);

exports.makeDonation = async (req, res) => {
  const { name, email, phone, amount, token } = req.body;

  try {
    const charge = await stripe.charges.create({
      amount: amount * 100,
      currency: 'usd',
      source: token.id,
      description: `Donation from ${name}`,
      receipt_email: email
    });
    if (charge.status == 'succeeded') {
      const donation = new Donation({ name, email, phone, amount });
      await donation.save();
      res.status(200).json({ message: 'Donation successful', donation });
    } else res.status(500).json({ message: 'payment failed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getDonation = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1; // Default to page 1
    const limit = parseInt(req.query.limit) || 10; // Default to 10 items per page
    const skip = (page - 1) * limit;

    const [donations, total] = await Promise.all([
      Donation.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
      Donation.countDocuments()
    ]);

    res.status(200).json({
      success: true,
      count: donations.length,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      data: donations
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server Error. Unable to fetch donations.'
    });
  }
};
