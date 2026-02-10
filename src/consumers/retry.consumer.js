const KafkaConsumer = require('../adapters/kafka/consumer');
const RedisAdapter = require('../adapters/redis.adapter');
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

class RetryConsumer {
  constructor(retryService, dlqService) {
    this.consumer = new KafkaConsumer(`${envConfig.kafka.consumerGroupId}-retry`);
    this.retryService = retryService;
    this.dlqService = dlqService;
    this.templateService = new TemplateService();
    
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
    await this.consumer.subscribe([envConfig.kafka.topics.retry]);
  }

  async processMessage(message) {
    const { value, headers } = message;
    const correlationId = headers['x-correlation-id'] || value.correlationId || 'unknown';
    const retryMetadata = value.retryMetadata || {};

    // Check if it's time to retry
    if (!this.retryService.shouldRetryNow(retryMetadata)) {
      logger.debug('[RetryConsumer] Skipping retry - not yet time', {
        correlationId,
        nextRetryAt: retryMetadata.nextRetryAt,
      });
      return;
    }

    // Check if max retries exceeded
    if (this.retryService.hasExceededMaxRetries(retryMetadata)) {
      logger.warn('[RetryConsumer] Max retries exceeded, sending to DLQ', {
        correlationId,
        retryCount: retryMetadata.retryCount,
      });
      await this.dlqService.publishToDLQ(value, new Error('Max retries exceeded'), retryMetadata);
      return;
    }

    try {
      logger.info('[RetryConsumer] Processing retry', {
        correlationId,
        retryCount: retryMetadata.retryCount,
        channel: value.channel,
      });

      const adapter = this.channelAdapters[value.channel];
      if (!adapter) {
        throw new Error(`Unknown channel: ${value.channel}`);
      }

      // Get template if needed
      let template = null;
      if (value.channel !== 'internal') {
        // Set Slack adapter in template service for email resolution
        if (value.channel === 'slack' && this.channelAdapters.slack) {
          this.templateService.setSlackAdapter(this.channelAdapters.slack);
        }
        template = await this.templateService.getTemplate(
          value.channel,
          value.templateId,
          value.data,
          value.recipients,
          correlationId
        );
      }

      // Retry sending
      if (value.channel === 'internal') {
        await adapter.send(value.recipients, value.data, correlationId);
      } else {
        await adapter.send(value.recipients, template, correlationId);
      }

      logger.info('[RetryConsumer] Retry successful', { correlationId });
    } catch (error) {
      const isTransient = error instanceof ChannelAdapterError && error.isTransient;

      if (isTransient && !this.retryService.hasExceededMaxRetries(retryMetadata)) {
        // Retry again
        await this.retryService.publishToRetry(value, retryMetadata.retryCount, error);
      } else {
        // Permanent failure or max retries - send to DLQ
        await this.dlqService.publishToDLQ(value, error, retryMetadata);
      }
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

module.exports = RetryConsumer;
