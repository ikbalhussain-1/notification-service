const KafkaConsumer = require('../adapters/kafka/consumer');
const SlackAdapter = require('../adapters/channels/slack.adapter');
const EmailAdapter = require('../adapters/channels/email.adapter');
const InternalEventsAdapter = require('../adapters/channels/internal-events.adapter');
const WebEngageAdapter = require('../adapters/channels/webengage.adapter');
const TemplateService = require('../services/template.service');
const RetryService = require('../services/retry.service');
const DLQService = require('../services/dlq.service');
const envConfig = require('../config/envConfig');
const { logger } = require('../utils/logger');
const { ChannelAdapterError } = require('../utils/errors');

class NotificationConsumer {
  constructor(retryService, dlqService, redisAdapter) {
    this.consumer = new KafkaConsumer();
    this.redis = redisAdapter;
    this.templateService = new TemplateService();
    this.retryService = retryService;
    this.dlqService = dlqService;
    
    // Channel adapters
    this.channelAdapters = {
      slack: new SlackAdapter(),
      email: new EmailAdapter(),
      webengage: new WebEngageAdapter(),
      internal: new InternalEventsAdapter(),
    };
  }


  async initialize() {
    await this.consumer.connect();
    await this.consumer.subscribe([envConfig.kafka.topics.events]);
  }

  async processMessage(message) {
    const { value, headers } = message;
    const correlationId = headers['correlation-id'] || value.correlationId || 'unknown';

    try {
      logger.info('[NotificationConsumer] Processing message', {
        correlationId,
        eventType: value.eventType,
        channels: value.channels,
      });

      // Process each channel
      for (const channel of value.channels) {
        await this.processChannel(correlationId, channel, value);
      }

      logger.info('[NotificationConsumer] Message processed successfully', { correlationId });
    } catch (error) {
      logger.error('[NotificationConsumer] Error processing message', {
        correlationId,
        error: error.message,
      });
      throw error;
    }
  }

  async processChannel(correlationId, channel, notificationData) {
    try {
      const adapter = this.channelAdapters[channel];
      if (!adapter) {
        throw new Error(`Unknown channel: ${channel}`);
      }

      // Get template if needed (internal events don't use templates)
      let template = null;
      if (channel !== 'internal') {
        // Set Slack adapter in template service for email resolution
        if (channel === 'slack' && this.channelAdapters.slack) {
          this.templateService.setSlackAdapter(this.channelAdapters.slack);
        }
        template = await this.templateService.getTemplate(
          channel,
          notificationData.templateId,
          notificationData.data,
          notificationData.recipients,
          correlationId
        );
      }

      // Send notification
      if (channel === 'internal') {
        await adapter.send(notificationData.recipients, notificationData.data, correlationId);
      } else {
        await adapter.send(notificationData.recipients, template, correlationId);
      }

      logger.info('[NotificationConsumer] Channel processed successfully', {
        correlationId,
        channel,
      });
    } catch (error) {
      const isTransient = error instanceof ChannelAdapterError && error.isTransient;

      if (isTransient) {
        // Retry
        await this.retryService.publishToRetry(
          { ...notificationData, channel },
          0,
          error
        );
      } else {
        // Permanent failure - send to DLQ
        await this.dlqService.publishToDLQ(
          { ...notificationData, channel },
          error
        );
      }
      throw error;
    }
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

module.exports = NotificationConsumer;
