/**
 * Custom error classes for the notification service
 */

class ValidationError extends Error {
  constructor(message, field = null) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
    this.statusCode = 400;
  }
}

class AuthenticationError extends Error {
  constructor(message = 'Authentication failed') {
    super(message);
    this.name = 'AuthenticationError';
    this.statusCode = 401;
  }
}

class TemplateNotFoundError extends Error {
  constructor(templateId, channel) {
    super(`Template not found: ${templateId} for channel: ${channel}`);
    this.name = 'TemplateNotFoundError';
    this.templateId = templateId;
    this.channel = channel;
    this.statusCode = 400;
  }
}

class ChannelAdapterError extends Error {
  constructor(channel, message, isTransient = false) {
    super(`Channel adapter error (${channel}): ${message}`);
    this.name = 'ChannelAdapterError';
    this.channel = channel;
    this.isTransient = isTransient;
  }
}

module.exports = {
  ValidationError,
  AuthenticationError,
  TemplateNotFoundError,
  ChannelAdapterError,
};
