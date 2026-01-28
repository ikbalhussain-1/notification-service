const { createClient } = require('redis');
const envConfig = require('../config/envConfig');
const { logger } = require('../utils/logger');

class RedisAdapter {
  constructor() {
    this.client = null;
    this.isConnected = false;
  }

  async connect() {
    if (this.isConnected) return;

    try {
      this.client = createClient({ url: envConfig.redis.uri });

      this.client.on('error', (err) => {
        logger.error('[RedisAdapter] Redis error', { error: err.message });
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        logger.info('[RedisAdapter] Redis connected');
        this.isConnected = true;
      });

      this.client.on('disconnect', () => {
        logger.warn('[RedisAdapter] Redis disconnected');
        this.isConnected = false;
      });

      await this.client.connect();
      this.isConnected = true;
      logger.info('[RedisAdapter] Redis connection established');
    } catch (error) {
      logger.error('[RedisAdapter] Failed to connect to Redis', { error: error.message });
      throw error;
    }
  }

  async disconnect() {
    if (this.client && this.isConnected) {
      await this.client.disconnect();
      this.isConnected = false;
      logger.info('[RedisAdapter] Redis disconnected');
    }
  }

  async exists(key) {
    if (!this.isConnected) {
      logger.warn('[RedisAdapter] Redis not connected, returning false');
      return false;
    }
    const result = await this.client.exists(key);
    return result === 1;
  }

  async set(key, value, ttlSeconds) {
    if (!this.isConnected) {
      logger.warn('[RedisAdapter] Redis not connected, skipping set');
      return;
    }
    await this.client.setEx(key, ttlSeconds, value);
  }

  async get(key) {
    if (!this.isConnected) {
      return null;
    }
    return await this.client.get(key);
  }

  getConnectionStatus() {
    return this.isConnected;
  }
}

module.exports = RedisAdapter;
