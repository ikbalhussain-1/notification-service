require('dotenv').config();

const envConfig = {
  port: parseInt(process.env.PORT || '3005', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  envPrefix: process.env.ENV_PREFIX || 'dev',

  // Redis Configuration
  redis: {
    uri: process.env.REDIS_URI || 'redis://localhost:6379',
  },

  // Kafka Configuration
  kafka: {
    bootstrapServers: (process.env.KAFKA_BOOTSTRAP_SERVERS).trim(),
    clientId: (process.env.KAFKA_CLIENT_ID || 'notification-service').trim(),
    consumerGroupId: (process.env.KAFKA_CONSUMER_GROUP_ID || 'notification-service-group').trim(),
    sasl: {
      mechanism: process.env.KAFKA_SASL_MECHANISM || 'plain',
      username: process.env.KAFKA_SASL_USERNAME || '',
      password: process.env.KAFKA_SASL_PASSWORD || '',
    },
    ssl: process.env.KAFKA_SSL_ENABLED === 'true',
    connectionTimeout: parseInt(process.env.KAFKA_CONNECTION_TIMEOUT || '10000', 10),
    requestTimeout: parseInt(process.env.KAFKA_REQUEST_TIMEOUT || '30000', 10),
    topics: {
      events: `${process.env.ENV_PREFIX || 'dev'}.notifications.events`,
      retry: `${process.env.ENV_PREFIX || 'dev'}.notifications.retry`,
      dlq: `${process.env.ENV_PREFIX || 'dev'}.notifications.dlq`,
    },
  },

  // API Authentication
  apiKey: process.env.API_KEY || '',

  // Slack Configuration
  slack: {
    botToken: process.env.SLACK_BOT_TOKEN || '',
    defaultChannel: process.env.SLACK_DEFAULT_CHANNEL || '',
  },

  // Email Configuration
  email: {
    smtp: {
      host: process.env.EMAIL_SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_SMTP_PORT || '587', 10),
      secure: process.env.EMAIL_SMTP_SECURE === 'true',
      user: process.env.EMAIL_SMTP_USER || '',
      password: process.env.EMAIL_SMTP_PASSWORD || '',
    },
    from: {
      name: process.env.EMAIL_FROM_NAME || 'Notification Service',
      address: process.env.EMAIL_FROM_ADDRESS || 'noreply@example.com',
    },
  },

  // Internal Events Platform
  internalEvents: {
    baseUrl: process.env.INTERNAL_EVENTS_BASE_URL || '',
    apiKey: process.env.INTERNAL_EVENTS_API_KEY || '',
    timeout: parseInt(process.env.INTERNAL_EVENTS_TIMEOUT || '5000', 10),
  },

  // Swagger Auth
  swagger: {
    user: process.env.SWAGGER_USER || 'admin',
    password: process.env.SWAGGER_PASSWORD || 'admin123',
  },

  // WebEngage (Future)
  webengage: {
    baseUrl: process.env.WEBENGAGE_BASE_URL || '',
    apiKey: process.env.WEBENGAGE_API_KEY || '',
  },
};

module.exports = envConfig;
