const crypto = require('crypto');
const RedisAdapter = require('../adapters/redis.adapter');
const { logger } = require('../utils/logger');
const envConfig = require('../config/envConfig');

class IdempotencyService {
  constructor(redisAdapter) {
    this.redis = redisAdapter;
    this.ttlSeconds = 24 * 60 * 60; // 24 hours
  }

  /**
   * Generate idempotency key from request payload
   * Includes environment prefix to avoid conflicts between dev/staging/prod
   */
  generateKey(payload) {
    const sortedPayload = JSON.stringify(payload, Object.keys(payload).sort());
    const hash = crypto.createHash('sha256').update(sortedPayload).digest('hex');
    return `${envConfig.envPrefix}:idempotency:${hash}`;
  }

  /**
   * Check if request is duplicate
   */
  async isDuplicate(key) {
    try {
      const exists = await this.redis.exists(key);
      return exists;
    } catch (error) {
      logger.error('[IdempotencyService] Error checking idempotency', { error: error.message });
      // Fail open - allow request if Redis check fails
      return false;
    }
  }

  /**
   * Mark request as processed
   */
  async markProcessed(key) {
    try {
      await this.redis.set(key, 'processed', this.ttlSeconds);
    } catch (error) {
      logger.error('[IdempotencyService] Error marking request as processed', { error: error.message });
      // Non-blocking - log but don't throw
    }
  }
}

module.exports = IdempotencyService;
