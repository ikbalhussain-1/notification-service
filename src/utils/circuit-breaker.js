const { logger } = require('./logger');

/**
 * Circuit Breaker pattern implementation
 * Prevents retry storms when a service is consistently failing
 */
class CircuitBreaker {
  constructor(name, options = {}) {
    this.name = name;
    this.failureThreshold = options.failureThreshold || 5;
    this.resetTimeout = options.resetTimeout || 60000; // 1 minute
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.successCount = 0;
    this.halfOpenSuccessThreshold = options.halfOpenSuccessThreshold || 2;
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute(fn) {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.resetTimeout) {
        this.state = 'HALF_OPEN';
        this.successCount = 0;
        logger.info(`[CircuitBreaker] ${this.name} entering HALF_OPEN state`);
      } else {
        const error = new Error(`Circuit breaker ${this.name} is OPEN`);
        error.name = 'CircuitBreakerOpenError';
        throw error;
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Handle successful execution
   */
  onSuccess() {
    this.failureCount = 0;
    
    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      if (this.successCount >= this.halfOpenSuccessThreshold) {
        this.state = 'CLOSED';
        this.successCount = 0;
        logger.info(`[CircuitBreaker] ${this.name} CLOSED - service recovered`);
      }
    } else if (this.state === 'OPEN') {
      // Shouldn't happen, but handle it
      this.state = 'CLOSED';
      logger.info(`[CircuitBreaker] ${this.name} CLOSED - service recovered`);
    }
  }

  /**
   * Handle failed execution
   */
  onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.failureThreshold) {
      if (this.state !== 'OPEN') {
        this.state = 'OPEN';
        logger.error(`[CircuitBreaker] ${this.name} OPEN - too many failures (${this.failureCount})`);
      }
    }
  }

  /**
   * Get current circuit breaker state
   */
  getState() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime,
    };
  }

  /**
   * Manually reset circuit breaker (for testing/admin)
   */
  reset() {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    logger.info(`[CircuitBreaker] ${this.name} manually reset`);
  }
}

module.exports = CircuitBreaker;
