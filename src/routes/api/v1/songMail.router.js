// routes/songMail.js (or wherever your router is defined)
const express = require('express');
const router = express.Router();
// Assuming subscriber.model.js exports the Mongoose model
const Subscriber = require('../../../models/subscriber.model.js'); 

const sgMail = require('@sendgrid/mail');
// Ensure dotenv is loaded in your main app.js or server.js file BEFORE this router
// Or add require('dotenv').config(); here if this router is an entry point
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Define a general unsubscribe base URL (adjust to your actual unsubscribe route)
const BASE_UNSUBSCRIBE_URL = 'http://localhost:5000/api/v1/unsubscribe/';

router.post('/', async (req, res) => {
  const { songName, coverImage, listenLink } = req.body; // Expecting listenLink from frontend

  if (!songName || !coverImage) {
    return res.status(400).json({ success: false, message: 'Missing songName or coverImage in request body.' });
  }
  // Ensure listenLink is provided or has a default
  const actualListenLink = listenLink || '#';

 

  try {
    const subscribers = await Subscriber.find();
    

    if (subscribers.length === 0) {
      return res.status(200).json({ success: true, message: 'No active subscribers found to send email to.' });
    }

    // Prepare personalizations for SendGrid
    const personalizations = subscribers.map(subscriber => ({
      to: [{ email: subscriber.email }], // Each recipient needs an array of objects
      dynamicTemplateData: {
        subscriberName: subscriber.name || 'Valued Subscriber',
        songName: songName,
        coverImage: coverImage,
        listenLink: actualListenLink,
        unsubscribeLink: `${BASE_UNSUBSCRIBE_URL}${subscriber._id}`, // Generate unique unsubscribe link
        currentYear: new Date().getFullYear(),
      },
    }));

    const msg = {
      from: process.env.SENDGRID_SENDER_EMAIL, // MUST be a verified sender in SendGrid
      templateId: process.env.SENDGRID_TEMPLATE_ID,
      personalizations: personalizations, 
    };

    // Send the email (one API call for all personalized emails)
    await sgMail.send(msg);

    console.log(`Successfully sent email notification for "${songName}" to ${subscribers.length} subscribers.`);
    res.status(200).json({
      success: true,
      message: `Email notification for "${songName}" sent to ${subscribers.length} subscribers.`,
      sentCount: subscribers.length,
      // SendGrid's response doesn't give per-email success/failure directly for bulk sends
      // You'd rely on SendGrid's activity feed and webhooks for that.
    });

  } catch (error) {
    console.error('Error sending emails with SendGrid:', error);

    // Provide more detailed error response from SendGrid
    if (error.response && error.response.body) {
      console.error('SendGrid API Error Response:', error.response.body);
      return res.status(500).json({
        success: false,
        message: 'Failed to send emails via SendGrid.',
        error: error.response.body.errors || error.response.body,
      });
    }

    res.status(500).json({
      success: false,
      message: 'An unexpected error occurred during email sending.',
      error: error.message,
    });
  }
});

module.exports = router;