const envConfig = require('../config/envConfig');
const { logger } = require('../utils/logger');

class RetryService {
  constructor(kafkaProducer) {
    this.producer = kafkaProducer;
    this.maxRetries = 5;
    this.backoffDelays = [60, 300, 900, 1800, 3600]; // 1min, 5min, 15min, 30min, 60min (in seconds)
  }

  /**
   * Calculate next retry timestamp
   */
  getNextRetryAt(retryCount) {
    if (retryCount >= this.maxRetries) {
      return null; // Max retries exceeded
    }
    const delaySeconds = this.backoffDelays[retryCount] || this.backoffDelays[this.backoffDelays.length - 1];
    return new Date(Date.now() + delaySeconds * 1000).toISOString();
  }

  /**
   * Publish message to retry topic
   */
  async publishToRetry(originalMessage, retryCount, lastError) {
    const retryMessage = {
      ...originalMessage,
      retryMetadata: {
        retryCount: retryCount + 1,
        nextRetryAt: this.getNextRetryAt(retryCount),
        lastError: lastError.message || String(lastError),
        lastRetryAt: new Date().toISOString(),
      },
    };

    const key = originalMessage.correlationId || originalMessage.eventId || 'retry';
    await this.producer.publish(
      envConfig.kafka.topics.retry,
      key,
      retryMessage,
      {
        'retry-count': String(retryCount + 1),
        'correlation-id': originalMessage.correlationId || '',
      }
    );

    logger.info('[RetryService] Published to retry topic', {
      correlationId: originalMessage.correlationId,
      retryCount: retryCount + 1,
    });
  }

  /**
   * Check if message should be retried now
   */
  shouldRetryNow(retryMetadata) {
    if (!retryMetadata || !retryMetadata.nextRetryAt) {
      return true; // No retry metadata, process immediately
    }
    return new Date(retryMetadata.nextRetryAt) <= new Date();
  }

  /**
   * Check if max retries exceeded
   */
  hasExceededMaxRetries(retryMetadata) {
    if (!retryMetadata || !retryMetadata.retryCount) {
      return false;
    }
    return retryMetadata.retryCount >= this.maxRetries;
  }
}

module.exports = RetryService;
