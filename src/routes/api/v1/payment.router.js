const express = require('express');
const router = express.Router();
const Stripe = require('stripe');
const User = require('../../../models/user.model.js');

// ✅ Replace with your actual secret key from Stripe dashboard
const stripe = new Stripe(
  'sk_test_51RQRPEDACnPx6ZPLo8nE5f7fMweHH7WzZ8q6xue5oAmLqZ8guyVxzZ3DrTvLoqff8GaoM8JJxPY7Yyzxh57yHgmi00mGsivtkB'
);

router.post('/create-checkout-session', async (req, res) => {
  try {
    const { products } = req.body;

    if (!products || !Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ error: 'Invalid products format' });
    }

    const product = products[0];

    if (!product.artist || !product.artist.stripeId) {
      return res
        .status(400)
        .json({ error: 'Artist is not connected to Stripe' });
    }

    const priceInCents = Math.round(product.price * 100); // e.g. $100 → 10000
    const platformFee = Math.round(priceInCents * 0.3); // e.g. 30% → 3000

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
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
            unit_amount: priceInCents
          },
          quantity: 1
        }
      ],
      mode: 'payment',
      success_url: `https://odgmusic.com/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `https://odgmusic.com/purchased?id=${encodeURIComponent(product._id)}`,
      metadata: {
        songId: product._id,
        album: product?.album?.title || product?.albumInfo?.title || 'Unknown'
      },
      payment_intent_data: {
        application_fee_amount: platformFee, // Platform fee (you keep this)
        transfer_data: {
          destination: product.artist.stripeId // The rest goes to artist
        }
      }
    });

    return res.status(200).json({ id: session.id });
  } catch (error) {
    console.error('Stripe session error:', error.message);
    return res.status(500).json({ error: error.message });
  }
});

router.post('/create-checkout-session-admin', async (req, res) => {
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
      success_url: `https://odgmusic.com/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `https://odgmusic.com/purchased?id=${encodeURIComponent(products[0]._id)}`,
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
    console.error('Stripe session error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

router.post('/onboard-artist', async (req, res) => {
  try {
    const { email, userId } = req.body; // You can use req.user if logged in

    // 1. Create a connected Express account
    const account = await stripe.accounts.create({
      type: 'express',
      email
    });

    // 2. Generate an onboarding 
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: 'https://odgmusic.com/dashboard/withdrawal',
      return_url: 'https://odgmusic.com/dashboard/withdrawal',
      type: 'account_onboarding'
    });

    // 3. Save `account.id` (e.g., acct_1RBVX...) in your DB under the artist user
    // You should associate this with the artist's account
    // Example: await User.findByIdAndUpdate(userId, { stripeAccountId: account.id });
    await User.findByIdAndUpdate(userId, {
      stripeId: account.id
    });
    res.status(200).json({ url: accountLink.url });
  } catch (err) {
    console.error('Stripe onboarding error:', err.message);
    res.status(500).json({ error: 'Failed to initiate Stripe onboarding' });
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
