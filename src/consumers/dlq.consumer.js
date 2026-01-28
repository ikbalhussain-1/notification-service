const KafkaConsumer = require('../adapters/kafka/consumer');
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
