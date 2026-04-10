// Shared response utilities for dashboard APIs
const sendSuccess = (res, data, statusCode = 202) => {
  res.status(statusCode).json(data);
};

const sendError = (res, message = 'Server error', statusCode = 500) => {
  res.status(statusCode).json({ error: message });
};

const handleValidationErrors = (req, res) => {
  const { validationResult } = require('express-validator');
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return true; // Errors were handled
  }
  return false; // No errors
};

module.exports = { sendSuccess, sendError, handleValidationErrors };