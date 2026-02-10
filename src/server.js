require('dotenv').config();
const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const router = require('./routes');
const swaggerAuth = require('./middlewares/swagger-auth.middleware');
const { getSwaggerConfig, getSwaggerUIOptions } = require('./infrastructure/swagger.config');
const envConfig = require('./config/envConfig');
const { logger } = require('./utils/logger');

// Adapters and Services
const RedisAdapter = require('./adapters/redis.adapter');
const KafkaProducer = require('./adapters/kafka/producer');
const IdempotencyService = require('./services/idempotency.service');
const RetryService = require('./services/retry.service');
const DLQService = require('./services/dlq.service');

// Controllers
const NotificationController = require('./controllers/notification.controller');
const HealthController = require('./controllers/health.controller');

// Consumers
const NotificationConsumer = require('./consumers/notification.consumer');
const RetryConsumer = require('./consumers/retry.consumer');
const DLQConsumer = require('./consumers/dlq.consumer');

const app = express();
const PORT = envConfig.port;

// Initialize adapters
const redisAdapter = new RedisAdapter();
const kafkaProducer = new KafkaProducer();

// Initialize services
const idempotencyService = new IdempotencyService(redisAdapter);
const retryService = new RetryService(kafkaProducer);
const dlqService = new DLQService(kafkaProducer);

// Initialize controllers
const notificationController = new NotificationController(idempotencyService, kafkaProducer);
const healthController = new HealthController(redisAdapter, kafkaProducer);

// Initialize consumers
const notificationConsumer = new NotificationConsumer(retryService, dlqService, redisAdapter);
const retryConsumer = new RetryConsumer(retryService, dlqService);
const dlqConsumer = new DLQConsumer();

// Middleware
app.use(cors());
app.use(express.json());

// Inject controllers into request for routes
app.use((req, res, next) => {
  req.notificationController = notificationController;
  req.healthController = healthController;
  next();
});

// Swagger Documentation
const swaggerSpec = getSwaggerConfig();
const swaggerUIOptions = getSwaggerUIOptions();

// Serve Swagger UI (protected with Basic Auth)
app.use(
  '/api-docs',
  swaggerAuth,
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, swaggerUIOptions)
);

// Serve raw Swagger JSON (protected with Basic Auth)
app.get(
  '/api-docs.json',
  swaggerAuth,
  (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  }
);

// Routes
app.use('/', router);

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('[Server] Unhandled error', {
    correlationId: req.correlationId,
    error: err.message,
    stack: err.stack,
  });

  res.status(err.statusCode || 500).json({
    success: false,
    error: {
      code: err.name || 'INTERNAL_ERROR',
      message: err.message || 'Internal server error',
    },
    correlationId: req.correlationId,
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Endpoint not found',
    },
  });
});

// Graceful shutdown
let isShuttingDown = false;

async function shutdown() {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info('[Server] Shutting down gracefully...');

  try {
    await notificationConsumer.stop();
    await retryConsumer.stop();
    await dlqConsumer.stop();
    await kafkaProducer.disconnect();
    await redisAdapter.disconnect();
    logger.info('[Server] Shutdown complete');
    process.exit(0);
  } catch (error) {
    logger.error('[Server] Error during shutdown', { error: error.message });
    process.exit(1);
  }
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Start server
async function start() {
  try {
    // Connect to Redis
    await redisAdapter.connect();
    logger.info('[Server] Redis connected');

    // Connect to Kafka
    await kafkaProducer.connect();
    logger.info('[Server] Kafka producer connected');

    // Start consumers
    await notificationConsumer.start();
    logger.info('[Server] Notification consumer started');

    await retryConsumer.start();
    logger.info('[Server] Retry consumer started');

    await dlqConsumer.start();
    logger.info('[Server] DLQ consumer started');

    // Start HTTP server
    app.listen(PORT, () => {
      logger.info('[Server] Server started', {
        port: PORT,
        nodeEnv: envConfig.nodeEnv,
        swaggerUrl: `http://localhost:${PORT}/api-docs`,
      });
    });
  } catch (error) {
    logger.error('[Server] Failed to start', { error: error.message });
    process.exit(1);
  }
}

start();

module.exports = app;
