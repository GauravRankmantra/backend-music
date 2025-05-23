const Footer = require('../models/footer.model.js'); // Adjust path if your model is elsewhere
const { asyncHandler } = require('../utils/asyncHandler.js'); // For simplifying error handling in async functions
// You might need to install express-async-handler: npm install express-async-handler

// @desc    Get footer data
// @route   GET /api/footer
// @access  Public (or adjust based on your needs)
const getFooter = asyncHandler(async (req, res) => {
  // Since there's likely only one footer configuration, we'll try to find one.
  // If no footer exists, we can create a default one or return an empty state.
  let footer = await Footer.findOne();

  if (!footer) {
    footer = await Footer.create({
      mainHeading:
        'ODG Music is more than just a website its a community built on a shared love for music. Connect with fellow enthusiasts, share your favorite tracks, and immerse yourself in the rhythm that unites us all',
      links: [
        { heading: 'Albums', link: '/albums' },
        { heading: 'Artist', link: '/artists' },
        { heading: 'Top Albums', link: '/albums' },
        { heading: 'Contact us ', link: '/contact' },
        { heading: 'Privacy Policy', link: '/privacy-policy' },
        { heading: 'Terms & Conditions', link: '/terms-and-conditions' }
      ],
      subscribe:
        'Subscribe to our newsletter and get the latest updates and offers.'
    });
    // Respond with 201 Created if we had to create it
    return res.status(201).json({
      success: true,
      message: 'Default footer created and retrieved successfully',
      data: footer
    });
  }

  res.status(200).json({
    success: true,
    message: 'Footer data retrieved successfully',
    data: footer
  });
});

const updateFooter = asyncHandler(async (req, res) => {
  const { id } = req.params; // Expecting the footer ID in the URL params
  const { mainHeading, links, subscribe } = req.body;

  if (!id) {
    res.status(400);
    throw new Error('Footer ID is required for update.');
  }

  // Find the footer by ID and update it
  const footer = await Footer.findById(id);

  if (!footer) {
    res.status(404);
    throw new Error('Footer not found.');
  }

  // Update fields if they are provided in the request body
  footer.mainHeading =
    mainHeading !== undefined ? mainHeading : footer.mainHeading;
  footer.links = links !== undefined ? links : footer.links;
  footer.subscribe = subscribe !== undefined ? subscribe : footer.subscribe;

  const updatedFooter = await footer.save();

  res.status(200).json({
    success: true,
    message: 'Footer data updated successfully',
    data: updatedFooter
  });
});

const deleteFooter = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    res.status(400);
    throw new Error('Footer ID is required for deletion.');
  }

  const footer = await Footer.findById(id);

  if (!footer) {
    res.status(404);
    throw new Error('Footer not found.');
  }

  await footer.deleteOne(); // Use deleteOne() on the document instance

  res.status(200).json({
    success: true,
    message: 'Footer data deleted successfully'
  });
});

module.exports = {
  getFooter,
  updateFooter,
  deleteFooter
};
