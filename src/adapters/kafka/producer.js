const { Kafka, logLevel } = require('kafkajs');
const envConfig = require('../../config/envConfig');
const { logger } = require('../../utils/logger');

class KafkaProducer {
  constructor() {
    this.kafka = null;
    this.producer = null;
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
      this.producer = this.kafka.producer({
        allowAutoTopicCreation: true,
        transactionTimeout: 30000,
      });

      await this.producer.connect();
      this.isConnected = true;
      logger.info('[KafkaProducer] Connected to Kafka');
    } catch (error) {
      logger.error('[KafkaProducer] Failed to connect', { error: error.message });
      throw error;
    }
  }

  async disconnect() {
    if (this.producer && this.isConnected) {
      await this.producer.disconnect();
      this.isConnected = false;
      logger.info('[KafkaProducer] Disconnected from Kafka');
    }
  }

  async publish(topic, key, message, headers = {}) {
    if (!this.isConnected) {
      throw new Error('Producer not connected. Call connect() first.');
    }

    try {
      await this.producer.send({
        topic,
        messages: [
          {
            key,
            value: JSON.stringify(message),
            headers,
          },
        ],
      });
      logger.info('[KafkaProducer] Published message', { topic, key });
    } catch (error) {
      logger.error('[KafkaProducer] Failed to publish', { topic, key, error: error.message });
      throw error;
    }
  }

  getConnectionStatus() {
    return this.isConnected;
  }
}

module.exports = KafkaProducer;
