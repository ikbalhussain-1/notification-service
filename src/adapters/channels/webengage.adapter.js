// Placeholder for future WebEngage implementation
const { logger } = require('../../utils/logger');
const { ChannelAdapterError } = require('../../utils/errors');

class WebEngageAdapter {
  constructor() {
    // Future: Initialize WebEngage client
  }

  async send(recipients, payload, correlationId) {
    logger.warn('[WebEngageAdapter] WebEngage adapter not implemented yet', { correlationId });
    throw new ChannelAdapterError('webengage', 'WebEngage adapter not implemented', false);
  }
}

module.exports = WebEngageAdapter;
