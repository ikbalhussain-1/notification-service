const envConfig = require('../config/envConfig');

/**
 * Generate a correlation ID (UUID v4)
 */
function generateCorrelationId() {
  const { randomUUID } = require('crypto');
  return randomUUID();
}

/**
 * Extract correlation ID from request headers
 * 
 * Standard: This service uses the 'x-correlation-id' header for request tracing.
 * If not provided, a new UUID is generated.
 * 
 * @param {Object} req - Express request object
 * @returns {string} Correlation ID (UUID v4)
 */
function extractCorrelationId(req) {
  if (!req || !req.headers) {
    return generateCorrelationId();
  }
  
  // Standard header: x-correlation-id
  return req.headers['x-correlation-id'] || generateCorrelationId();
}

/**
 * Structured JSON logger
 */
function log(level, message, context = {}) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level: level.toUpperCase(),
    message,
    ...context,
  };

  // In production, only log WARN and above
  if (envConfig.nodeEnv === 'production') {
    if (['WARN', 'ERROR'].includes(logEntry.level)) {
      console.log(JSON.stringify(logEntry));
    }
  } else {
    // In development, log everything with pretty-print formatting
    console.log(JSON.stringify(logEntry, null, 2));
  }
}

const logger = {
  info: (message, context) => log('info', message, context),
  warn: (message, context) => log('warn', message, context),
  error: (message, context) => log('error', message, context),
  debug: (message, context) => log('debug', message, context),
};

module.exports = {
  logger,
  generateCorrelationId,
  extractCorrelationId,
};
