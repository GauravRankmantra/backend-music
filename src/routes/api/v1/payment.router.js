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

    console.log('products', products);

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
      cancel_url: `http://localhost:5000/purchased?id=${encodeURIComponent(products[0]._id)}`,
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
    const session = await stripe.checkout.sessions.retrieve(req.params.id, {
      expand: ['payment_intent'] // no need to expand 'charges' anymore
    });

    const paymentIntent = session.payment_intent;
    const chargeId = paymentIntent.latest_charge;

    if (!chargeId) {
      return res.status(202).json({
        message: 'Charge not yet available. Try again shortly.',
        status: paymentIntent.status
      });
    }

    const charge = await stripe.charges.retrieve(chargeId);
    const balanceTransaction = await stripe.balanceTransactions.retrieve(
      charge.balance_transaction
    );

    res.status(200).json({
      songId: session.metadata.songId,
      album: session.metadata.album,
      paymentInfo: {
        amount_received: paymentIntent.amount_received / 100,
        currency: paymentIntent.currency,
        payment_intent_id: paymentIntent.id,
        charge_id: charge.id,
        stripe_fee: balanceTransaction.fee / 100,
        net_amount: balanceTransaction.net / 100,
        total_amount: balanceTransaction.amount / 100,
        status: paymentIntent.status,
        created_at: new Date(paymentIntent.created * 1000),
        exchange_rate: balanceTransaction.exchange_rate,
        card_last4: charge.payment_method_details?.card?.last4,
        card_brand: charge.payment_method_details?.card?.brand,
        country: charge.billing_details?.address?.country || 'N/A',
        buyer_paid_usd: session.amount_total / 100, // amount charged in Checkout
        platform_currency: balanceTransaction.currency.toUpperCase(), // e.g., CAD
        platform_received: balanceTransaction.amount / 100, // in CAD
        stripe_fee: balanceTransaction.fee / 100,
        net_amount: balanceTransaction.net / 100
      }
    });
  } catch (err) {
    console.error('Failed to retrieve session:', err);
    res.status(500).json({ error: 'Failed to get session info' });
  }
});

module.exports = router;
