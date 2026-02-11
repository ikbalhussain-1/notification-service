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
   * @deprecated Use markProcessed() which provides atomic check-and-set
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
   * Atomically mark request as processed (SETNX)
   * Returns true if key was set (new request), false if key already exists (duplicate)
   * 
   * Fails open when Redis is unavailable - allows request to proceed but logs warning
   */
  async markProcessed(key) {
    try {
      const result = await this.redis.setNX(key, 'processed', this.ttlSeconds);
      return result;
    } catch (error) {
      logger.warn('[IdempotencyService] Redis unavailable, allowing request (idempotency disabled)', {
        error: error.message,
        key,
      });
      // Fail open - allow request to proceed when Redis is unavailable
      // This prevents service outage but may allow duplicate requests
      return true; // Treat as new request
    }
  }
}

module.exports = IdempotencyService;
