const { Kafka, logLevel } = require('kafkajs');
const envConfig = require('../../config/envConfig');
const { logger } = require('../../utils/logger');

class KafkaConsumer {
  constructor(consumerGroupId = null) {
    this.kafka = null;
    this.consumer = null;
    this.admin = null;
    this.consumerGroupId = consumerGroupId || envConfig.kafka.consumerGroupId;
    this.isConnected = false;
  }

  async connect() {
    if (this.isConnected) return;

    try {
      // Parse bootstrap servers (KafkaJS expects array, config provides comma-separated string)
      const brokers = envConfig.kafka.bootstrapServers
        .split(',')
        .map(broker => broker.trim())
        .filter(broker => broker.length > 0);

      if (brokers.length === 0) {
        throw new Error('KAFKA_BOOTSTRAP_SERVERS is empty');
      }

      const kafkaConfig = {
        clientId: envConfig.kafka.clientId,
        brokers,
        connectionTimeout: envConfig.kafka.connectionTimeout,
        requestTimeout: envConfig.kafka.requestTimeout,
        logLevel: envConfig.nodeEnv === 'production' ? logLevel.WARN : logLevel.INFO,
      };

      // Add SASL if both username and password are provided
      if (envConfig.kafka.sasl.username && envConfig.kafka.sasl.password) {
        kafkaConfig.sasl = {
          mechanism: envConfig.kafka.sasl.mechanism,
          username: envConfig.kafka.sasl.username,
          password: envConfig.kafka.sasl.password,
        };
      }

      // Add SSL if enabled
      if (envConfig.kafka.ssl) {
        kafkaConfig.ssl = true;
      }

      this.kafka = new Kafka(kafkaConfig);
      this.consumer = this.kafka.consumer({
        groupId: this.consumerGroupId,
        sessionTimeout: 30000,
        heartbeatInterval: 3000,
        maxWaitTimeInMs: 5000,
      });

      // Create admin client for topic management
      this.admin = this.kafka.admin();

      await this.consumer.connect();
      
      // Try to connect admin client, but don't fail if it doesn't work
      try {
        await this.admin.connect();
      } catch (error) {
        logger.warn('[KafkaConsumer] Admin client connection failed (topic auto-creation may not work)', {
          error: error.message,
        });
        this.admin = null;
      }
      
      this.isConnected = true;
      logger.info('[KafkaConsumer] Connected to Kafka', { groupId: this.consumerGroupId });
    } catch (error) {
      logger.error('[KafkaConsumer] Failed to connect', { error: error.message });
      throw error;
    }
  }

  async ensureTopicsExist(topics) {
    if (!this.isConnected) {
      throw new Error('Consumer not connected. Call connect() first.');
    }

    // If admin client is not available, skip topic creation
    if (!this.admin) {
      logger.debug('[KafkaConsumer] Admin client not available, skipping topic creation', { topics });
      return;
    }

    try {
      // Check which topics exist
      const metadata = await this.admin.listTopics();
      const existingTopics = new Set(metadata);

      // Filter out topics that don't exist
      const topicsToCreate = topics.filter(topic => !existingTopics.has(topic));

      if (topicsToCreate.length > 0) {
        logger.info('[KafkaConsumer] Creating missing topics', { topics: topicsToCreate });
        
        await this.admin.createTopics({
          topics: topicsToCreate.map(topic => ({
            topic,
            numPartitions: 1,
            replicationFactor: 1,
          })),
          waitForLeaders: true,
          timeout: 5000,
        });

        logger.info('[KafkaConsumer] Topics created successfully', { topics: topicsToCreate });
      } else {
        logger.debug('[KafkaConsumer] All topics already exist', { topics });
      }
    } catch (error) {
      // Log warning but don't fail - topics might be created by other means
      logger.warn('[KafkaConsumer] Could not ensure topics exist', {
        topics,
        error: error.message,
      });
    }
  }

  async disconnect() {
    if (this.isConnected) {
      if (this.consumer) {
        await this.consumer.disconnect();
      }
      if (this.admin) {
        await this.admin.disconnect();
      }
      this.isConnected = false;
      logger.info('[KafkaConsumer] Disconnected from Kafka');
    }
  }

  async subscribe(topics) {
    if (!this.isConnected) {
      throw new Error('Consumer not connected. Call connect() first.');
    }

    // Ensure topics exist before subscribing
    await this.ensureTopicsExist(topics);

    try {
      await this.consumer.subscribe({ topics, fromBeginning: false });
      logger.info('[KafkaConsumer] Subscribed to topics', { topics });
    } catch (error) {
      logger.error('[KafkaConsumer] Failed to subscribe to topics', {
        topics,
        error: error.message,
      });
      throw error;
    }
  }

  async run(messageHandler) {
    if (!this.isConnected) {
      throw new Error('Consumer not connected. Call connect() first.');
    }

    await this.consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const key = message.key?.toString();
          const value = JSON.parse(message.value.toString());
          const headers = {};
          
          if (message.headers) {
            for (const [key, val] of Object.entries(message.headers)) {
              headers[key] = val.toString();
            }
          }

          await messageHandler({
            topic,
            partition,
            offset: message.offset,
            key,
            value,
            headers,
          });
        } catch (error) {
          logger.error('[KafkaConsumer] Error processing message', {
            topic,
            partition,
            offset: message.offset,
            error: error.message,
          });
        }
      },
    });
  }

  getConnectionStatus() {
    return this.isConnected;
  }
}

module.exports = KafkaConsumer;
