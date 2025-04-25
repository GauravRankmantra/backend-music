const mongoose = require('mongoose');
const Traffic = require("./src/models/traffic.model.js"); // Make sure this path is correct
require('dotenv').config();
mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .then(async () => {
    console.log('Connected');

    await Traffic.collection.dropIndex('dayDate_1');
    console.log('Index dropped');
    process.exit();
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
