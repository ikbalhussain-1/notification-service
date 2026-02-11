const KafkaConsumer = require('../adapters/kafka/consumer');
const MessageValidator = require('../utils/message-validator');
const envConfig = require('../config/envConfig');
const { logger } = require('../utils/logger');

class DLQConsumer {
  constructor() {
    this.consumer = new KafkaConsumer(`${envConfig.kafka.consumerGroupId}-dlq`);
  }

  async initialize() {
    await this.consumer.connect();
    await this.consumer.subscribe([envConfig.kafka.topics.dlq]);
  }

  async processMessage(message) {
    const { value } = message;
    
    // Validate message structure
    try {
      MessageValidator.validateDLQMessage(value);
    } catch (validationError) {
      logger.error('[DLQConsumer] Invalid DLQ message format', {
        error: validationError.message,
        value: JSON.stringify(value),
      });
      // Can't send to DLQ if DLQ message itself is invalid, just log
      return;
    }

    const correlationId = value.originalMessage?.correlationId || 'unknown';

    logger.error('[DLQConsumer] DLQ message received', {
      correlationId,
      error: value.error?.message,
      retryCount: value.retryMetadata?.retryCount,
      failedAt: value.failedAt,
    });

    // In v1, we just log. Future: could send alerts, store in database, etc.
  }

  async start() {
    await this.initialize();
    await this.consumer.run(async (message) => {
      await this.processMessage(message);
    });
  }

  async stop() {
    await this.consumer.disconnect();
  }
}

module.exports = DLQConsumer;
