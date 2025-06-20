const { Client, Environment } = require("square");
const { randomUUID } = require("crypto");

// Square SDK client setup
const squareClient = new Client({
  accessToken: process.env.SQUARE_ACCESS_TOKEN,
  environment: Environment.Sandbox, // Use `Environment.Production` in prod
});

const paymentsApi = squareClient.paymentsApi;

// BigInt fix for Square responses (optional, only if needed)
BigInt.prototype.toJSON = function () {
  return this.toString();
};


    async function getUSDtoCADRate() {
  try {
    const response = await axios.get('https://v6.exchangerate-api.com/v6/b4e37ee808807ae6f52bc2f0/latest/USD');
    return response.data.conversion_rates.CAD;
  } catch (err) {
    console.error('Error fetching exchange rate:', err);
    return 1.36; // fallback if API fails
  }
}


// Controller to handle Square token and create payment
exports.submitSquarePayment = async (req, res) => {
  const { sourceId, product, buyerEmail } = req.body;

  if (!sourceId || !product?.price) {
    return res.status(400).json({ error: "Missing payment information" });
  }

  try {
        const usdToCadRate = await getUSDtoCADRate();
    const priceInCadCents = Math.round(product.price * usdToCadRate * 100);


    const { result } = await paymentsApi.createPayment({
      sourceId,
      idempotencyKey: randomUUID(),
      amountMoney: {
        currency: "CAD", // or "CAD" based on your use case
        amount: priceInCadCents,
      },
      buyerEmailAddress: buyerEmail || undefined,
    });

 

    return res.status(200).json({
      message: "Payment successful",
      paymentId: result.payment.id,
      orderId: result.payment.orderId,
      status: result.payment.status,
      amount: result.payment.amountMoney,
      result:result
    });
  } catch (error) {
    console.error("Square Payment Error:", error);
    const message =
      error?.errors?.[0]?.detail || "An error occurred during payment";
    return res.status(500).json({ error: message });
  }
};
