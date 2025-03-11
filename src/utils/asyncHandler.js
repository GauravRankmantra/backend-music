module.exports.asyncHandler = (fn) => {
  return async (req, res, next) => {
    try {
      await fn(req, res, next);
    } catch (error) {
      res.status(error.statusCode || 500).send({
        success: false,
        message: error.message || 'Internal Server Error'
      });
    }
  };
};
