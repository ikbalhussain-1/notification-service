const { extractCorrelationId } = require('../utils/logger');

const correlationMiddleware = (req, res, next) => {
  const correlationId = extractCorrelationId(req);
  req.correlationId = correlationId;
  res.setHeader('X-Correlation-Id', correlationId);
  next();
};

module.exports = correlationMiddleware;
