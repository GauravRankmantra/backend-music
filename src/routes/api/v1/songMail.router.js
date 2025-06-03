
const express= require('express')
const router = express.Router();
const Subscriber = require('../../../models/subscriber.model.js')
const path = require('path');
const fs = require('fs').promises; 
const ejs = require('ejs');
const transporter = require('../../../services/nodemailerConfig.js');


// Helper function to render email template
async function renderEmailTemplate(templateName, data) {
  try {
    const templatePath = path.join(__dirname, 'views', `${templateName}.ejs`);
    const templateString = await fs.readFile(templatePath, 'utf-8');
    return ejs.render(templateString, data);
  } catch (error) {
    console.error(`Error rendering email template ${templateName}:`, error);
    throw error;
  }
}

// --- API Endpoint to Send Emails ---
router.post('/', async (req, res) => {
  const { songName, coverImage, listenLink = '#' } = req.body; // Added listenLink for actual usage

  if (!songName || !coverImage) {
    return res.status(400).json({ success: false, message: 'Missing songName or coverImage in request body.' });
  }

  console.log(`Admin requested to send email for song: ${songName} with cover: ${coverImage}`);

  try {
    const subscribers = await Subscriber.find(); // Only send to active subscribers
    console.log(`Found ${subscribers.length} active subscribers.`);

    if (subscribers.length === 0) {
      return res.status(200).json({ success: true, message: 'No active subscribers found to send email to.' });
    }

    const BATCH_SIZE = 50; // Adjust based on Mailtrap/ESP limits and performance needs
    const BATCH_DELAY_MS = 1000; // 1-second delay between batches

    let emailsSentCount = 0;
    let emailsFailedCount = 0;

    for (let i = 0; i < subscribers.length; i += BATCH_SIZE) {
      const batch = subscribers.slice(i, i + BATCH_SIZE);
      console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} emails)...`);

      const emailPromises = batch.map(async (subscriber) => {
        const unsubscribeLink = `http://localhost:5000/api/v1/unsubscribe/${subscriber._id}`; // Example: point to your unsubscribe endpoint
        
        // Render personalized HTML content
        const emailHtml = await renderEmailTemplate('newSongNotification', {
          songName,
          coverImage,
          listenLink,
          subscriberName: subscriber.name,
          unsubscribeLink,
          currentYear: new Date().getFullYear(),
        });

        const mailOptions = {
          from: process.env.SENDER_EMAIL,
          to: subscriber.email,
          subject: `🎶 New Music Alert: ${songName} is HERE!`,
          html: emailHtml,
          // You can also add a text version for better deliverability/accessibility
          // text: `Hey ${subscriber.name},\n\nCheck out our new song: ${songName}\nListen here: ${listenLink}\n\nThanks!\nYour Music App\n\nTo unsubscribe: ${unsubscribeLink}`
        };

        try {
          const info = await transporter.sendMail(mailOptions);
          console.log(`Email sent to ${subscriber.email}: ${info.messageId}`);
          emailsSentCount++;
          return { email: subscriber.email, status: 'sent', messageId: info.messageId };
        } catch (error) {
          console.error(`Failed to send email to ${subscriber.email}:`, error.message);
          emailsFailedCount++;
          return { email: subscriber.email, status: 'failed', error: error.message };
        }
      });

      // Wait for all emails in the current batch to be attempted
      await Promise.allSettled(emailPromises);

      // Add a delay between batches for rate limiting if not the last batch
      if (i + BATCH_SIZE < subscribers.length) {
        console.log(`Waiting for ${BATCH_DELAY_MS / 1000}s before next batch...`);
        await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
      }
    }

    console.log(`Email sending process completed. Sent: ${emailsSentCount}, Failed: ${emailsFailedCount}`);
    res.status(200).json({
      success: true,
      message: 'Email sending process initiated.',
      sent: emailsSentCount,
      failed: emailsFailedCount
    });

  } catch (error) {
    console.error('Error during email sending process:', error);
    res.status(500).json({ success: false, message: 'Internal server error during email sending.', error: error.message });
  }
});

module.exports = router;