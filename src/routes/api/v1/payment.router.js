const express = require("express");
const router = express.Router();
const Stripe = require("stripe");

// ✅ Replace with your actual secret key from Stripe dashboard
const stripe = new Stripe("sk_test_51RBVXW071DpBkmZmiBDb0Xj1Q13aPUk23vbxqSeDo6GZgtNYKB2QNO26zBa8v3ZK0L4UFTlY78KCZ5GYdRPLtZPT00Q7B636Fw");

// Create Checkout Session
router.post("/create-checkout-session", async (req, res) => {
  try {
    const { products } = req.body;

    if (!products || !Array.isArray(products)) {
      return res.status(400).json({ error: "Invalid products format" });
    }
    console.log("profucts",products)

    const line_items = products.map((product) => ({
      price_data: {
        currency: "doller",
        product_data: {
          name: product.title,
          description: product?.album?.title ||product?.albumInfo?.title ||"No album info",
          images: product.coverImage ? [product.coverImage] : [],
        },
        unit_amount: product.price // price in paise
      },
      quantity: 1,
    }));

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items,
      mode: "payment",
      success_url: "http://localhost:5173/success",
      cancel_url: "http://localhost:5173/cancel",
    });

    res.status(200).json({ id: session.id });
  } catch (error) {
    console.error("Stripe session error:", error);
    res.status(500).json({ error: "Failed to create checkout session" });
  }
});

module.exports = router;
