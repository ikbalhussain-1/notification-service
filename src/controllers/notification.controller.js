const IdempotencyService = require('../services/idempotency.service');
const KafkaProducer = require('../adapters/kafka/producer');
const { generateCorrelationId } = require('../utils/logger');
const { logger } = require('../utils/logger');
const envConfig = require('../config/envConfig');

class NotificationController {
  constructor(idempotencyService, kafkaProducer) {
    this.idempotencyService = idempotencyService;
    this.kafkaProducer = kafkaProducer;
  }

  sendNotification = async (req, res) => {
    const correlationId = req.correlationId || generateCorrelationId();
    const payload = {
      eventType: req.body.eventType,
      channels: req.body.channels,
      recipients: req.body.recipients,
      templateId: req.body.templateId,
      data: req.body.data,
      correlationId: req.body.correlationId || correlationId,
      priority: req.body.priority || 'normal',
    };

    try {
      // Check idempotency
      const idempotencyKey = this.idempotencyService.generateKey(payload);
      const isDuplicate = await this.idempotencyService.isDuplicate(idempotencyKey);

      if (isDuplicate) {
        logger.info('[NotificationController] Duplicate request detected', { correlationId });
        return res.status(202).json({
          success: true,
          message: 'Notification request accepted (duplicate)',
          correlationId,
        });
      }

      // Mark as processed
      await this.idempotencyService.markProcessed(idempotencyKey);

      // Publish to Kafka
      await this.kafkaProducer.publish(
        envConfig.kafka.topics.events,
        correlationId,
        payload,
        {
          'event-type': payload.eventType,
          'correlation-id': correlationId,
        }
      );

      logger.info('[NotificationController] Notification request published', {
        correlationId,
        eventType: payload.eventType,
        channels: payload.channels,
      });

      res.status(202).json({
        success: true,
        message: 'Notification request accepted',
        correlationId,
      });
    } catch (error) {
      logger.error('[NotificationController] Error processing notification request', {
        correlationId,
        error: error.message,
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to process notification request',
        },
        correlationId,
      });
    }
  };
}

module.exports = NotificationController;
