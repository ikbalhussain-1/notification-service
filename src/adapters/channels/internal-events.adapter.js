const axios = require('axios');
const envConfig = require('../../config/envConfig');
const { logger } = require('../../utils/logger');
const { ChannelAdapterError } = require('../../utils/errors');

class InternalEventsAdapter {
  constructor() {
    this.baseUrl = envConfig.internalEvents.baseUrl;
    this.apiKey = envConfig.internalEvents.apiKey;
    this.timeout = envConfig.internalEvents.timeout;
  }

  async send(recipients, payload, correlationId) {
    const targets = recipients.internalEventTargets || [];

    if (!targets.length) {
      throw new ChannelAdapterError('internal', 'No internal event targets specified', false);
    }

    try {
      const promises = targets.map(target =>
        axios.post(
          `${this.baseUrl}/events`,
          {
            target,
            ...payload,
          },
          {
            headers: {
              'Authorization': `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json',
            },
            timeout: this.timeout,
          }
        )
      );

      await Promise.all(promises);
      logger.info('[InternalEventsAdapter] Event sent successfully', {
        correlationId,
        targets: targets.length,
      });
    } catch (error) {
      const isTransient = error.code === 'ECONNRESET' ||
                         error.code === 'ETIMEDOUT' ||
                         (error.response && error.response.status >= 500);
      
      logger.error('[InternalEventsAdapter] Failed to send event', {
        correlationId,
        error: error.message,
        isTransient,
      });

      throw new ChannelAdapterError('internal', error.message, isTransient);
    }
  }
}

module.exports = InternalEventsAdapter;
