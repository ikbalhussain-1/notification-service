const envConfig = require('../config/envConfig');
const KafkaProducer = require('../adapters/kafka/producer');
const { logger } = require('../utils/logger');

class DLQService {
  constructor(kafkaProducer) {
    this.producer = kafkaProducer;
  }

  /**
   * Publish message to dead letter queue
   */
  async publishToDLQ(originalMessage, error, retryMetadata = null) {
    const dlqMessage = {
      originalMessage,
      error: {
        message: error.message || String(error),
        stack: error.stack,
        name: error.name,
      },
      retryMetadata,
      failedAt: new Date().toISOString(),
    };

    const key = originalMessage.correlationId || originalMessage.eventId || 'dlq';
    await this.producer.publish(
      envConfig.kafka.topics.dlq,
      key,
      dlqMessage,
      {
        'error-type': error.name || 'UnknownError',
        'x-correlation-id': originalMessage.correlationId || '',
      }
    );

    logger.error('[DLQService] Published to DLQ', {
      correlationId: originalMessage.correlationId,
      error: error.message,
    });
  }
}

module.exports = DLQService;
