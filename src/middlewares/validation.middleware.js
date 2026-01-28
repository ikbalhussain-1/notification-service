const { body, validationResult } = require('express-validator');
const { ValidationError } = require('../utils/errors');

const validateNotificationRequest = [
  body('eventType')
    .notEmpty()
    .withMessage('eventType is required')
    .isString()
    .withMessage('eventType must be a string'),
  
  body('channels')
    .isArray({ min: 1 })
    .withMessage('channels must be a non-empty array')
    .custom((channels) => {
      const validChannels = ['email', 'slack', 'webengage', 'internal'];
      const invalidChannels = channels.filter(ch => !validChannels.includes(ch));
      if (invalidChannels.length > 0) {
        throw new Error(`Invalid channels: ${invalidChannels.join(', ')}`);
      }
      return true;
    }),
  
  body('recipients')
    .isObject()
    .withMessage('recipients must be an object')
    .custom((recipients, { req }) => {
      const channels = req.body.channels || [];
      const errors = [];
      
      if (channels.includes('email') && (!recipients.email || !Array.isArray(recipients.email) || recipients.email.length === 0)) {
        errors.push('recipients.email is required when email channel is specified');
      }
      // slack recipients are optional; if provided they must be a non-empty array
      if (recipients.slackUsers && (!Array.isArray(recipients.slackUsers) || recipients.slackUsers.length === 0)) {
        errors.push('recipients.slackUsers must be a non-empty array when provided');
      }
      if (channels.includes('webengage') && (!recipients.webengageUsers || !Array.isArray(recipients.webengageUsers) || recipients.webengageUsers.length === 0)) {
        errors.push('recipients.webengageUsers is required when webengage channel is specified');
      }
      if (channels.includes('internal') && (!recipients.internalEventTargets || !Array.isArray(recipients.internalEventTargets) || recipients.internalEventTargets.length === 0)) {
        errors.push('recipients.internalEventTargets is required when internal channel is specified');
      }
      
      if (errors.length > 0) {
        throw new Error(errors.join('; '));
      }
      return true;
    }),
  
  body('templateId')
    .notEmpty()
    .withMessage('templateId is required')
    .isString()
    .withMessage('templateId must be a string'),
  
  body('data')
    .isObject()
    .withMessage('data must be an object'),
  
  body('correlationId')
    .optional()
    .isString()
    .withMessage('correlationId must be a string'),
  
  body('priority')
    .optional()
    .isIn(['low', 'normal', 'high'])
    .withMessage('priority must be one of: low, normal, high'),
];

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  // extract correlationId from body or header for consistent responses
  const correlationId = req.body?.correlationId || req.headers['x-correlation-id'] || null;
  // make available to downstream middleware/handlers
  res.locals.correlationId = correlationId;

  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(err => ({
      field: err.path,
      message: err.msg,
    }));
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: errorMessages,
      },
      data: {
        correlationId,
      },
    });
  }
  next();
};

module.exports = {
  validateNotificationRequest,
  handleValidationErrors,
};
