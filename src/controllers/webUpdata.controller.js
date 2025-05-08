const {asyncHandler} = require('../utils/asyncHandler.js');
const Web = require('../models/webUpdate.model.js'); 
const { isValidObjectId } = require('mongoose'); 

module.exports.addWebUpdate = asyncHandler(async (req, res) => {
  const { heading, subHeading, link } = req.body;

  
  if (!heading || typeof heading !== 'string' || heading.trim() === '') {
    return res.status(400).json({ success: false, message: 'Heading is required and must be a non-empty string.' });
  }

  if (subHeading && typeof subHeading !== 'string') {
    return res.status(400).json({ success: false, message: 'Subheading must be a string.' });
  }

  if (link && typeof link !== 'string') {
    return res.status(400).json({ success: false, message: 'Link must be a string.' });
  }

  try {
    const newWebUpdate = await Web.create({ heading, subHeading, link });

    if (newWebUpdate) {
      return res.status(201).json({ 
        success: true,
        message: 'Web update created successfully.',
        data: newWebUpdate,
      });
    } else {
      return res.status(500).json({ 
        success: false,
        message: 'Failed to save the web update to the database.',
      });
    }
  } catch (error) {
    console.error('Error creating web update:', error);
   
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(el => el.message);
      return res.status(400).json({ success: false, message: `Validation error: ${errors.join(', ')}` });
    }
    return res.status(500).json({
      success: false,
      message: 'An unexpected error occurred while creating the web update.',
      error: error.message, 
    });
  }
});

// Get all web updates
module.exports.getAllWebUpdates = asyncHandler(async (req, res) => {
    try {
      const webUpdates = await Web.find().sort({ createdAt: -1 }); 
      return res.status(200).json({
        success: true,
        message: 'Web updates retrieved successfully.',
        data: webUpdates,
      });
    } catch (error) {
      console.error('Error fetching web updates:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve web updates.',
        error: error.message,
      });
    }
  });
  

  module.exports.getWebUpdateById = asyncHandler(async (req, res) => {
    const { id } = req.params;
  
    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid web update ID.' });
    }
  
    try {
      const webUpdate = await Web.findById(id);
  
      if (!webUpdate) {
        return res.status(404).json({ success: false, message: 'Web update not found.' });
      }
  
      return res.status(200).json({
        success: true,
        message: 'Web update retrieved successfully.',
        data: webUpdate,
      });
    } catch (error) {
      console.error('Error fetching web update by ID:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve the web update.',
        error: error.message,
      });
    }
  });
  

  module.exports.updateWebUpdate = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { heading, subHeading, link } = req.body;
  
    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid web update ID.' });
    }
  

  
    try {
      const updatedWebUpdate = await Web.findByIdAndUpdate(
        id,
        { heading, subHeading, link },
        { new: true, runValidators: true } // new: true returns the modified document, runValidators ensures schema validation
      );
  
      if (!updatedWebUpdate) {
        return res.status(404).json({ success: false, message: 'Web update not found.' });
      }
  
      return res.status(200).json({
        success: true,
        message: 'Web update updated successfully.',
        data: updatedWebUpdate,
      });
    } catch (error) {
      console.error('Error updating web update:', error);
      if (error.name === 'ValidationError') {
        const errors = Object.values(error.errors).map(el => el.message);
        return res.status(400).json({ success: false, message: `Validation error: ${errors.join(', ')}` });
      }
      return res.status(500).json({
        success: false,
        message: 'Failed to update the web update.',
        error: error.message,
      });
    }
  });
  
  // Delete a specific web update by ID
  module.exports.deleteWebUpdate = asyncHandler(async (req, res) => {
    const { id } = req.params;
  
    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid web update ID.' });
    }
  
    try {
      const deletedWebUpdate = await Web.findByIdAndDelete(id);
  
      if (!deletedWebUpdate) {
        return res.status(404).json({ success: false, message: 'Web update not found.' });
      }
  
      return res.status(200).json({
        success: true,
        message: 'Web update deleted successfully.',
        data: deletedWebUpdate, // Optionally return the deleted data
      });
    } catch (error) {
      console.error('Error deleting web update:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete the web update.',
        error: error.message,
      });
    }
  });