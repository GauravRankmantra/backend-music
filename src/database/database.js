const mongoose = require('mongoose');
require('dotenv').config();

module.exports.connectDB = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
};
