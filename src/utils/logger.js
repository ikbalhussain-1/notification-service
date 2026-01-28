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
 */
function extractCorrelationId(req) {
  if (!req || !req.headers) {
    return generateCorrelationId();
  }
  
  return (
    req.headers['x-correlation-id'] ||
    req.headers['x-request-id'] ||
    req.headers['correlation-id'] ||
    generateCorrelationId()
  );
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
    // In development, log everything
    console.log(JSON.stringify(logEntry));
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
