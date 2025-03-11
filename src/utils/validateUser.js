const validator = require('validator');

module.exports.validateUser = (req, res) => {


  const { email = '', fullName = '', password = '' } = req.body;

  // Helper function for length validation
  const isValidLength = (field, maxLength) => field?.length <= maxLength;

  // Check for required fields
  if ( !fullName || !password) {
    return res.status(400).json({
      success: false,
      message: 'Request data missing'
    });
  }

  const trimmedEmail = email.trim();
  const trimmedFullName = fullName.trim();

 

  // Validate email
  if (!validator.isEmail(trimmedEmail)) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a valid email address.'
    });
  }
  if (!isValidLength(trimmedEmail, 50)) {
    return res.status(400).json({
      success: false,
      message: 'Email cannot exceed 50 characters.'
    });
  }

  // Validate fullName
  if (!isValidLength(trimmedFullName, 30)) {
    return res.status(400).json({
      success: false,
      message: 'Full name cannot exceed 30 characters.'
    });
  }
};
