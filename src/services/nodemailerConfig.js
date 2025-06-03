// config/nodemailerConfig.js
const nodemailer = require('nodemailer');
require('dotenv').config(); // Load environment variables

const transporter = nodemailer.createTransport({
  host: process.env.MAILTRAP_HOST,
  port: process.env.MAILTRAP_PORT, // Ensure port is a number
//   secure: process.env.MAILTRAP_PORT === '465', // Use `true` for 465, `false` for other ports (like 587)
  auth: {
    user: process.env.MAILTRAP_USER,
    pass: process.env.MAILTRAP_PASS,
  },
  // Essential for bulk/batch sending
//   pool: true, // Use a connection pool
//   maxConnections: 5, // Keep this relatively low for Mailtrap (they have limits)
//   maxMessages: Infinity, // Keep connections open
});

// Optional: Verify the connection (good for startup debugging)
transporter.verify(function (error, success) {
  if (error) {
    console.error('Nodemailer connection error:', error);
  } else {
    console.log('Nodemailer server is ready to take our messages!');
  }
});

module.exports = transporter;