const express = require('express');
const router = express.Router();
const Stripe = require('stripe');
const User = require('../../../models/user.model.js');

const stripe = new Stripe(
  'sk_test_51ATmKHDDS4z6YL4JHf7lHAlud5gERC8DhJDj316h9IR87kYUCoA7YuRShrzVHgtyJ618spYGmYJVYsWGog6rbuYq00mDBiEJko'
);
const formatUnixTimestamp = (timestamp) => {
  if (!timestamp) return null;
  return new Date(timestamp * 1000).toISOString();
};

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

router.get('/stripe/session/:id', async (req, res) => {
  try {
    const session = await stripe.checkout.sessions.retrieve(req.params.id, {
      expand: ['payment_intent']
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

    const response = {
      status: 'success',
      message: 'Payment successful and transaction details retrieved.',
      songId: session.metadata.songId,
      album: session.metadata.album,
      paymentIntentId: paymentIntent.id,
      receiptUrl: charge.receipt_url,
      customerFacingAmount: (paymentIntent.amount / 100).toFixed(2),
      customerFacingCurrency: paymentIntent.currency.toUpperCase(),
      amountReceived: (paymentIntent.amount_received / 100).toFixed(2),
      paymentStatus: paymentIntent.status,
      paymentMethodType: paymentIntent.payment_method_types[0] || null,
      receiptEmail: paymentIntent.receipt_email,
      createdTimestamp: paymentIntent.created,
      createdDateTime: formatUnixTimestamp(paymentIntent.created),
      latestChargeId: paymentIntent.latest_charge,
      description: paymentIntent.description,
      customer: paymentIntent.customer,
      captureMethod: paymentIntent.capture_method,

      balanceTransactionId: balanceTransaction.id,
      processedAmount: (balanceTransaction.amount / 100).toFixed(2),
      processedCurrency: balanceTransaction.currency.toUpperCase(),
      netAmount: (balanceTransaction.net / 100).toFixed(2),
      feeAmount: (balanceTransaction.fee / 100).toFixed(2),
      feeCurrency:
        balanceTransaction.fee_details[0]?.currency?.toUpperCase() || null,
      exchangeRate: balanceTransaction.exchange_rate,
      originalCurrency: balanceTransaction.exchange_rate
        ? paymentIntent.currency.toUpperCase()
        : balanceTransaction.currency.toUpperCase(),
      convertedCurrency: balanceTransaction.currency.toUpperCase(),
      balanceType: balanceTransaction.balance_type,
      availableOnTimestamp: balanceTransaction.available_on,
      availableOnDateTime: formatUnixTimestamp(balanceTransaction.available_on),
      transactionCreatedTimestamp: balanceTransaction.created,
      transactionCreatedDateTime: formatUnixTimestamp(
        balanceTransaction.created
      ),
      reportingCategory: balanceTransaction.reporting_category,
      transactionStatus: balanceTransaction.status,
      transactionType: balanceTransaction.type,
      feeDetails: balanceTransaction.fee_details,
      rawStripeData: {
        balanceTransaction,
        paymentIntent
      }
    };

    res.status(200).json(response);
  } catch (err) {
    console.error('Failed to retrieve session:', err);
    res.status(500).json({ error: 'Failed to get session info' });
  }
});

router.post('/donation', async (req, res) => {
  const { amount } = req.body;

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'usd',
      description: 'ODG Music Donation'
    });

    res.send({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Payment initiation failed' });
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
    if (!account)
      return res
        .status(400)
        .json({ message: 'Stripe connection failed or exited by user ' });

    // 2. Generate an onboarding
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: 'https://odgmusic.com/dashboard/withdrawal',
      return_url: 'https://odgmusic.com/dashboard/withdrawal',
      type: 'account_onboarding'
    });
    if (!accountLink)
      return res
        .status(400)
        .json({ message: 'Stripe connection failed or exited by user ' });

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

module.exports = router;
