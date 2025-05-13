const express = require('express');
const router = express.Router();
const Stripe = require('stripe');

// ✅ Replace with your actual secret key from Stripe dashboard
const stripe = new Stripe(
  'sk_test_51RBVXW071DpBkmZmiBDb0Xj1Q13aPUk23vbxqSeDo6GZgtNYKB2QNO26zBa8v3ZK0L4UFTlY78KCZ5GYdRPLtZPT00Q7B636Fw'
);

// Create Checkout Session
router.post('/create-checkout-session', async (req, res) => {
  try {
    const { products } = req.body;

    if (!products || !Array.isArray(products)) {
      return res.status(400).json({ error: 'Invalid products format' });
    }

    const line_items = products.map((product) => ({
      price_data: {
        currency: 'usd',
        product_data: {
          name: product.title,
          description:
            product?.album?.title ||
            product?.albumInfo?.title ||
            'No album info',
          images: product.coverImage ? [product.coverImage] : []
        },
        unit_amount: Math.round(product.price * 100)
      },
      quantity: 1
    }));

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items,
      mode: 'payment',
      success_url: `http://localhost:5173/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `http://localhost:5173/purchased?id=${encodeURIComponent(products[0]._id)}`,
      metadata: {
        songId: products[0]._id,
        album:
          products[0]?.album?.title ||
          products[0]?.albumInfo?.title ||
          'Unknown'
      }
    });

    res.status(200).json({ id: session.id });
  } catch (error) {
    console.error('Stripe session error:', error.message); // 👈 log the actual message
    res.status(500).json({ error: error.message }); // 👈 send it to frontend
  }
});

router.get('/stripe/session/:id', async (req, res) => {
  try {
    const session = await stripe.checkout.sessions.retrieve(req.params.id);
    const { metadata } = session;

    console.log('metadata', metadata);

    res.status(200).json({
      songId: metadata.songId,
      album: metadata.album
    });
  } catch (err) {
    console.error('Failed to retrieve session:', err);
    res.status(500).json({ error: 'Failed to get session info' });
  }
});

module.exports = router;
