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
      
      channels.forEach(channel => {
        if (channel === 'email') {
          if (!recipients.email || typeof recipients.email !== 'object') {
            errors.push('recipients.email is required and must be an object');
            return;
          }
          if (!recipients.email.to || !Array.isArray(recipients.email.to) || recipients.email.to.length === 0) {
            errors.push('recipients.email.to is required and must be a non-empty array');
          }
        }
        
        if (channel === 'slack') {
          if (!recipients.slack || typeof recipients.slack !== 'object') {
            errors.push('recipients.slack is required and must be an object');
            return;
          }
          
          const slack = recipients.slack;
          
          // Validate channel (optional)
          if (slack.channel !== undefined && typeof slack.channel !== 'string') {
            errors.push('recipients.slack.channel must be a string when provided');
          }
          
          // Validate usersToTag (optional - for tagging in channel messages)
          if (slack.usersToTag !== undefined) {
            if (!Array.isArray(slack.usersToTag) || slack.usersToTag.length === 0) {
              errors.push('recipients.slack.usersToTag must be a non-empty array when provided');
            }
          }
          
          // Validate usersToDM (optional - for sending DMs)
          if (slack.usersToDM !== undefined) {
            if (!Array.isArray(slack.usersToDM) || slack.usersToDM.length === 0) {
              errors.push('recipients.slack.usersToDM must be a non-empty array when provided');
            }
          }
          
          // Validate options
          if (slack.options) {
            if (typeof slack.options !== 'object') {
              errors.push('recipients.slack.options must be an object');
            } else {
              // Validate sendDMs (only used when usersToTag is provided)
              if (slack.options.sendDMs !== undefined && typeof slack.options.sendDMs !== 'boolean') {
                errors.push('recipients.slack.options.sendDMs must be a boolean');
              }
              
              // Validate channelTags (supports single string or array)
              if (slack.options.channelTags !== undefined) {
                const validTags = ['channel', 'here', 'everyone'];
                if (typeof slack.options.channelTags === 'string') {
                  if (!validTags.includes(slack.options.channelTags)) {
                    errors.push('recipients.slack.options.channelTags must be one of: channel, here, everyone');
                  }
                } else if (Array.isArray(slack.options.channelTags)) {
                  const invalidTags = slack.options.channelTags.filter(tag => !validTags.includes(tag));
                  if (invalidTags.length > 0) {
                    errors.push(`Invalid channelTags: ${invalidTags.join(', ')}. Must be one of: channel, here, everyone`);
                  }
                } else {
                  errors.push('recipients.slack.options.channelTags must be a string or array of strings');
                }
              }
            }
          }
          
          // At least one of channel, usersToTag, or usersToDM must be provided
          if (!slack.channel && !slack.usersToTag && !slack.usersToDM) {
            errors.push('recipients.slack must have at least one of: channel, usersToTag, or usersToDM');
          }
          
          // If sendDMs is true, usersToTag must be provided
          if (slack.options?.sendDMs === true && !slack.usersToTag) {
            errors.push('recipients.slack.options.sendDMs requires recipients.slack.usersToTag to be provided');
          }
        }
        
        if (channel === 'webengage') {
          if (!recipients.webengage || typeof recipients.webengage !== 'object') {
            errors.push('recipients.webengage is required and must be an object');
            return;
          }
          if (!recipients.webengage.users || !Array.isArray(recipients.webengage.users) || recipients.webengage.users.length === 0) {
            errors.push('recipients.webengage.users is required and must be a non-empty array');
          }
          if (recipients.webengage.options && typeof recipients.webengage.options !== 'object') {
            errors.push('recipients.webengage.options must be an object');
          }
        }
        
        if (channel === 'internal') {
          if (!recipients.internal || typeof recipients.internal !== 'object') {
            errors.push('recipients.internal is required and must be an object');
            return;
          }
          if (!recipients.internal.targets || !Array.isArray(recipients.internal.targets) || recipients.internal.targets.length === 0) {
            errors.push('recipients.internal.targets is required and must be a non-empty array');
          }
          if (recipients.internal.options && typeof recipients.internal.options !== 'object') {
            errors.push('recipients.internal.options must be an object');
          }
        }
      });
      
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
