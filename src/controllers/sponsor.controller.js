const Sponsor = require('../models/sponsor.model.js');
const Stripe = require('stripe');
const stripe = new Stripe(
  'sk_test_51ATmKHDDS4z6YL4JHf7lHAlud5gERC8DhJDj316h9IR87kYUCoA7YuRShrzVHgtyJ618spYGmYJVYsWGog6rbuYq00mDBiEJko'
);

exports.makeSponsor = async (req, res) => {
  const { name, email, phone, amount, token } = req.body;

  try {
    const charge = await stripe.charges.create({
      amount: amount * 100, // in paise/cents
      currency: 'usd',
      source: token.id,
      description: `Sponsor from ${name}`,
      receipt_email: email
    });

    const sponsor = new Sponsor({ name, email, phone, amount });
    await sponsor.save();

    res.status(200).json({ message: 'Sponsor successful', sponsor });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


exports.getSponsor = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;        // Default to page 1
    const limit = parseInt(req.query.limit) || 10;     // Default to 10 items per page
    const skip = (page - 1) * limit;

    const [sponsors, total] = await Promise.all([
      Sponsor.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Sponsor.countDocuments()
    ]);

    res.status(200).json({
      success: true,
      count: sponsors.length,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      data: sponsors,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server Error. Unable to fetch donations.',
    });
  }
};