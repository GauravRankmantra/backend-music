const express = require('express');
const router = express.Router();
const ContactInfo = require("../../../models/contactInfo.model.js")
const ContactForm  = require("../../../models/contactForm.model.js")




  router.post('/', async (req, res) => {
    const { name, phone, email, message } = req.body;
  
    // Validation
    if (!phone || !email) {
      return res.status(400).json({
        success: false,
        message: 'Phone and email are required.',
      });
    }
  
    try {
      const formEntry = new ContactForm({ name, phone, email, message });
      const saved = await formEntry.save();
      return res.status(201).json({
        success: true,
        message: 'Contact form submitted successfully.',
        data: saved,
      });
    } catch (error) {
      console.error('Error saving contact form:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error. Please try again later.',
      });
    }
  });
  
  // GET: Fetch all submitted contact forms (for admin)
  router.get('/', async (req, res) => {
    try {
      const forms = await ContactForm.find().sort({ createdAt: -1 });
      return res.status(200).json({
        success: true,
        data: forms,
      });
    } catch (error) {
      console.error('Error fetching contact forms:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch contact forms.',
      });
    }
  });

  router.delete('/:id', async (req, res) => {
    const { id } = req.params;
  
    try {
      const deletedForm = await ContactForm.findByIdAndDelete(id);
      if (!deletedForm) {
        return res.status(404).json({
          success: false,
          message: 'Contact form not found.',
        });
      }
  
      return res.status(200).json({
        success: true,
        message: 'Contact form deleted successfully.',
      });
    } catch (error) {
      console.error('Error deleting contact form:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete contact form.',
      });
    }
  });
  
  


  
router.get('/contact-info', async (req, res) => {
    const info = await ContactInfo.findOne(); 
    res.json(info);
  });
  // PUT /api/contact-info/:id
  router.put('/contact-info/:id', async (req, res) => {

    const updated = await ContactInfo.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  });
  router.post('/contact-info', async (req, res) => {
    try {
      const existing = await ContactInfo.findOne();
      if (existing) {
        return res.status(400).json({ message: 'Contact info already exists. Please update instead.' });
      }
  
      const contactInfo = new ContactInfo(req.body);
      await contactInfo.save();
      res.status(201).json(contactInfo);
    } catch (error) {
      res.status(500).json({ message: 'Error creating contact info', error });
    }
  });


module.exports = router;
