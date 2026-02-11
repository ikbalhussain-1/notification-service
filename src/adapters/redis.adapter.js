const { createClient } = require('redis');
const envConfig = require('../config/envConfig');
const { logger } = require('../utils/logger');

class RedisAdapter {
  constructor() {    this.reconnectTimer = null;
    this.shouldReconnect = true;
  }

  async connect() {
    if (this.isConnected && this.client?.isReady) return;

    try {
      this.client = createClient({ 
        url: envConfig.redis.uri,
        socket: {
          reconnectStrategy: (retries) => {
            // Let Redis client handle reconnection internally
            if (retries > 5) {
              logger.error('[RedisAdapter] Max reconnection attempts reached');
              return new Error('Max reconnection attempts reached');
            }
            const delay = Math.min(retries * 100, 3000);
            logger.debug('[RedisAdapter] Reconnecting...', { retries, delay });
            return delay;
          }
        }
      });

      this.client.on('error', (err) => {
        logger.error('[RedisAdapter] Redis error', { error: err.message });
        this.isConnected = false;
      });

      this.client.on('ready', () => {
        logger.info('[RedisAdapter] Redis ready');
        this.isConnected = true;
      });

      this.client.on('reconnecting', () => {
        logger.warn('[RedisAdapter] Redis reconnecting...');
        this.isConnected = false;
      });

      this.client.on('disconnect', () => {
        logger.warn('[RedisAdapter] Redis disconnected');
        this.isConnected = false;
      });

      await this.client.connect();
      this.isConnected = true;
      logger.info('[RedisAdapter] Redis connected');
    } catch (error) {
      logger.error('[RedisAdapter] Failed to connect to Redis', { error: error.message });
      throw error;
    }
  }

  // Non-blocking reconnection check
  async ensureConnected() {
    if (this.isConnected && this.client?.isReady) {
      return true;
    }
    
    // Try to reconnect if not already attempting
    if (!this.reconnectTimer && this.shouldReconnect) {
      this.reconnectTimer = setTimeout(async () => {
        this.reconnectTimer = null;
        try {
          if (!this.isConnected) {
            await this.connect();
          }
        } catch (error) {
          logger.warn('[RedisAdapter] Reconnection attempt failed', { error: error.message });
        }
      }, 1000);
    }
    
    return this.isConnected;
  }

  async disconnect() {
    if (this.client && this.isConnected) {
      await this.client.disconnect();
      this.isConnected = false;
      logger.info('[RedisAdapter] Redis disconnected');
    }
  }

  async exists(key) {
    await this.ensureConnected();
    if (!this.isConnected) {
      logger.warn('[RedisAdapter] Redis not connected, returning false');
      return false;
    }
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      logger.error('[RedisAdapter] Error checking exists', { error: error.message });
      this.isConnected = false;
      return false; // Fail open for idempotency
    }
  }

  async set(key, value, ttlSeconds) {
    await this.ensureConnected();
    if (!this.isConnected) {
      logger.warn('[RedisAdapter] Redis not connected, skipping set');
      return;
    }
    try {
      await this.client.setEx(key, ttlSeconds, value);
    } catch (error) {
      logger.error('[RedisAdapter] Error setting key', { error: error.message });
      this.isConnected = false;
      // Non-blocking - log but don't throw
    }
  }

  // Atomic check-and-set using SETNX
  async setNX(key, value, ttlSeconds) {
    await this.ensureConnected();
    if (!this.isConnected) {
      logger.warn('[RedisAdapter] Redis not connected, throwing error for upstream handling');
      throw new Error('Redis not connected');
    }
    try {
      const result = await this.client.setNX(key, value);
      if (result === 1) {
        // Key was set, now set TTL
        await this.client.expire(key, ttlSeconds);
        return true;
      }
      return false; // Key already exists
    } catch (error) {
      logger.error('[RedisAdapter] Error in setNX', { error: error.message });
      this.isConnected = false;
      throw error; // Throw for upstream error handling
    }
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
