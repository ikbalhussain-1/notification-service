const swaggerJsdoc = require('swagger-jsdoc');
const envConfig = require('../config/envConfig');

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Notification Service API',
    version: '1.0.0',
    description: 'API documentation for the Generic Notification Service',
    contact: {
      name: 'API Support',
    },
  },
  servers: [
    {
      url: `http://localhost:${envConfig.port}`,
      description: 'Development Server',
    },
  ],
  components: {
    securitySchemes: {
      ApiKeyAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'X-API-Key',
      },
    },
    schemas: {
      ApiResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: true,
          },
          message: {
            type: 'string',
          },
          correlationId: {
            type: 'string',
          },
        },
      },
      ApiError: {
        type: 'object',
        properties: {
          code: {
            type: 'string',
            example: 'VALIDATION_ERROR',
          },
          message: {
            type: 'string',
            example: 'Validation failed',
          },
          details: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                field: {
                  type: 'string',
                },
                message: {
                  type: 'string',
                },
              },
            },
          },
        },
      },
    },
  },
  tags: [
    {
      name: 'Notifications',
      description: 'Notification sending endpoints',
    },
    {
      name: 'Health',
      description: 'Health and readiness check endpoints',
    },
  ],
};

const options = {
  swaggerDefinition,
  apis: ['./src/routes/*.js'],
};

const getSwaggerConfig = () => {
  return swaggerJsdoc(options);
};

const getSwaggerUIOptions = () => {
  return {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Notification Service API Docs',
  };
};

module.exports = {
  getSwaggerConfig,
  getSwaggerUIOptions,
};
