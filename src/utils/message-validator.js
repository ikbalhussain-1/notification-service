const { logger } = require('./logger');

/**
 * Message validation utilities for Kafka consumers
 */
class MessageValidator {
  /**
   * Validate notification message structure
   */
  static validateNotificationMessage(value) {
    if (!value || typeof value !== 'object') {
      throw new Error('Message value must be an object');
    }

    const required = ['eventType', 'channels', 'recipients', 'templateId', 'data'];
    const missing = required.filter(field => !value[field]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required fields: ${missing.join(', ')}`);
    }

    if (!Array.isArray(value.channels) || value.channels.length === 0) {
      throw new Error('channels must be a non-empty array');
    }

    const validChannels = ['email', 'slack', 'webengage', 'internal'];
    const invalidChannels = value.channels.filter(ch => !validChannels.includes(ch));
    if (invalidChannels.length > 0) {
      throw new Error(`Invalid channels: ${invalidChannels.join(', ')}`);
    }

    if (typeof value.recipients !== 'object' || value.recipients === null) {
      throw new Error('recipients must be an object');
    }

    if (typeof value.templateId !== 'string' || value.templateId.trim() === '') {
      throw new Error('templateId must be a non-empty string');
    }

    if (typeof value.data !== 'object' || value.data === null) {
      throw new Error('data must be an object');
    }

    if (value.eventType && typeof value.eventType !== 'string') {
      throw new Error('eventType must be a string');
    }

    return true;
  }

  /**
   * Validate retry message structure
   */
  static validateRetryMessage(value) {
    if (!value || typeof value !== 'object') {
      throw new Error('Retry message value must be an object');
    }

    if (!value.channel || typeof value.channel !== 'string') {
      throw new Error('Retry message must have channel field (string)');
    }

    const validChannels = ['email', 'slack', 'webengage', 'internal'];
    if (!validChannels.includes(value.channel)) {
      throw new Error(`Invalid channel in retry message: ${value.channel}`);
    }

    if (!value.recipients || typeof value.recipients !== 'object') {
      throw new Error('Retry message must have recipients object');
    }

    if (value.channel !== 'internal') {
      if (!value.templateId || typeof value.templateId !== 'string') {
        throw new Error('Retry message must have templateId for non-internal channels');
      }
      if (!value.data || typeof value.data !== 'object') {
        throw new Error('Retry message must have data object for non-internal channels');
      }
    }

    return true;
  }

  /**
   * Validate DLQ message structure
   */
  static validateDLQMessage(value) {
    if (!value || typeof value !== 'object') {
      throw new Error('DLQ message value must be an object');
    }

    if (!value.originalMessage || typeof value.originalMessage !== 'object') {
      throw new Error('DLQ message must have originalMessage object');
    }

    if (!value.error || typeof value.error !== 'object') {
      throw new Error('DLQ message must have error object');
    }

    return true;
  }
}

module.exports = MessageValidator;
