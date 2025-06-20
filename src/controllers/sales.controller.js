const Sales = require('../models/sales.model.js');
const User = require('../models/user.model.js');

module.exports.createSale = async (req, res) => {
  try {
    const {
      songId,
      buyerId,
      sellerId,
      paymentIntentId,
      customerFacingAmount,
      customerFacingCurrency,
      amountReceived,
      paymentStatus,
      paymentMethodType,
      receiptEmail,
      createdTimestamp,
      createdDateTime,
      latestChargeId,
      description,
      customer,
      captureMethod,
      balanceTransactionId,
      processedAmount,
      processedCurrency,
      netAmount,
      feeAmount,
      feeCurrency,
      exchangeRate,
      originalCurrency,
      convertedCurrency,
      balanceType,
      availableOnTimestamp,
      availableOnDateTime,
      transactionCreatedTimestamp,
      transactionCreatedDateTime,
      reportingCategory,
      transactionStatus,
      transactionType,
      feeDetails,
      sellerEarning,
      adminEarning,
      receiptUrl
    } = req.body;

    

    // Validate required fields
    if (!songId || !buyerId || !sellerId || !amountReceived) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check for duplicates
    const existingSale = await Sales.findOne({ songId, buyerId });
    if (existingSale) {
      return res.status(409).json({
        error: 'This user has already purchased this song.',
        sale: existingSale
      });
    }

    // Calculate revenue split

    // const sellerSharePercentage = 0.7;
    // const sellerEarning = parseFloat(
    //   (amountPaid * sellerSharePercentage).toFixed(2)
    // );
    // const adminEarning = parseFloat((amountPaid - sellerEarning)-platformShare.toFixed(2)); // admin keeps rest

    const sale = await Sales.create({
      songId,
      buyerId,
      sellerId,
      paymentIntentId,
      customerFacingAmount,
      customerFacingCurrency,
      amountReceived,
      paymentStatus,
      paymentMethodType,
      receiptEmail,
      createdTimestamp,
      createdDateTime,
      latestChargeId,
      description,
      customer,
      captureMethod,
      balanceTransactionId,
      processedAmount,
      processedCurrency,
      netAmount,
      feeAmount,
      feeCurrency,
      exchangeRate,
      originalCurrency,
      convertedCurrency,
      balanceType,
      availableOnTimestamp,
      availableOnDateTime,
      transactionCreatedTimestamp,
      transactionCreatedDateTime,
      reportingCategory,
      transactionStatus,
      transactionType,
      feeDetails,
      sellerEarning,
      adminEarning,
      receiptUrl
    });

    res.status(201).json({ message: 'Sale recorded successfully', sale });
    // res.status(201).json({ message: 'Sale recorded successfully' });
  } catch (err) {
    console.error('Error creating sale:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get all sales
module.exports.getAllSales = async (req, res) => {
  try {
    const sales = await Sales.find()
      .sort({ createdAt: -1 })
      .populate({
        path: 'songId',
        select: '_id title'
      })
      .populate({
        path: 'buyerId',
        select: '_id fullName'
      })
      .populate({
        path: 'sellerId',
        select: '_id fullName admin'
      });

    res.status(200).json(sales);
  } catch (err) {
    console.error('Error fetching filtered sales:', err);
    res.status(500).json({ error: 'Failed to fetch sales' });
  }
};

// Get single sale by ID
module.exports.getSaleById = async (req, res) => {
  try {
    const { id } = req.params;
    const sale = await Sales.findById(id).populate('songId buyerId sellerId');

    if (!sale) {
      return res.status(404).json({ error: 'Sale not found' });
    }

    res.status(200).json(sale);
  } catch (err) {
    console.error('Error fetching sale:', err);
    res.status(500).json({ error: 'Failed to retrieve sale' });
  }
};

// Update sale (e.g., payout status)
module.exports.updateSale = async (req, res) => {
  try {
    const { payoutStatus } = req.body;
    if (!['pending', 'paid', 'rejected'].includes(payoutStatus)) {
      return res.status(400).json({ error: 'Invalid payout status' });
    }

    const sale = await Sales.findByIdAndUpdate(
      req.params.id,
      {
        payoutStatus,
        payoutDate: payoutStatus === 'paid' ? new Date() : null
      },
      { new: true }
    );

    if (!sale) {
      return res.status(404).json({ error: 'Sale not found' });
    }

    res.status(200).json({ message: 'Payout status updated', sale });
  } catch (err) {
    console.error('Error updating payout status:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports.getSaleByUserId = async (req, res) => {
  try {
    const { id } = req.params;
    const sale = await Sales.find({ buyerId: id }).populate('songId');

    if (!sale) {
      return res.status(404).json({ error: 'Sale not found' });
    }

    res.status(200).json(sale);
  } catch (err) {
    console.error('Error fetching sale:', err);
    res.status(500).json({ error: 'Failed to retrieve sale' });
  }
};
