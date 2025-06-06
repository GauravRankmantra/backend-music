
const express = require('express');
const router = express.Router();
const Subscriber = require('../../../models/subscriber.model.js'); 

const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);


const BASE_UNSUBSCRIBE_URL = 'http://localhost:5000/api/v1/unsubscribe/';

router.post('/', async (req, res) => {
  const { songName, coverImage, listenLink } = req.body; 

  if (!songName || !coverImage) {
    return res.status(400).json({ success: false, message: 'Missing songName or coverImage in request body.' });
  }

  const actualListenLink = listenLink || '#';

  try {
    const subscribers = await Subscriber.find();
    

    if (subscribers.length === 0) {
      return res.status(200).json({ success: true, message: 'No active subscribers found to send email to.' });
    }


    const personalizations = subscribers.map(subscriber => ({
      to: [{ email: subscriber.email }], 
      dynamicTemplateData: {
        subscriberName: subscriber.name || 'Valued Subscriber',
        songName: songName,
        coverImage: coverImage,
        listenLink: actualListenLink,
        unsubscribeLink: `${BASE_UNSUBSCRIBE_URL}${subscriber._id}`, 
        currentYear: new Date().getFullYear(),
      },
    }));

    const msg = {
      from: process.env.SENDGRID_SENDER_EMAIL,
      templateId: process.env.SENDGRID_TEMPLATE_ID,
      personalizations: personalizations, 
    };

    await sgMail.send(msg);

    console.log(`Successfully sent email notification for "${songName}" to ${subscribers.length} subscribers.`);
    res.status(200).json({
      success: true,
      message: `Email notification for "${songName}" sent to ${subscribers.length} subscribers.`,
      sentCount: subscribers.length,
    });

  } catch (error) {
    console.error('Error sending emails with SendGrid:', error);
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