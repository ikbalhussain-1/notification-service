# Notification Service - Implementation Choices Document

**Date:** 2024  
**Service:** Generic Notification Service  
**Language:** Node.js (JavaScript)  

---

## 1. Technology Stack

### Core Framework & Runtime
- **Runtime:** Node.js (JavaScript)
- **Web Framework:** Express.js
- **Kafka Client:** kafkajs (v2.2.4+)
- **Redis Client:** redis (v5.x)
- **Email:** nodemailer (for Gmail SMTP)
- **Validation:** express-validator
- **HTTP Client:** axios (for WebEngage & Internal Events Platform)
- **API Documentation:** swagger-jsdoc + swagger-ui-express

---

## 2. Project Structure

```
notification-service/
├── src/
│   ├── config/
│   │   └── envConfig.js          # Environment configuration
│   ├── adapters/
│   │   ├── redis.adapter.js      # Redis connection & idempotency store
│   │   ├── kafka/
│   │   │   ├── producer.js       # Kafka producer for publishing events
│   │   │   └── consumer.js        # Thin Kafka consumer wrapper
│   │   └── channels/
│   │       ├── slack.adapter.js
│   │       ├── email.adapter.js
│   │       ├── webengage.adapter.js  # Placeholder for future implementation
│   │       └── internal-events.adapter.js
│   ├── consumers/
│   │   ├── notification.consumer.js    # Main consumer for notifications.events
│   │   ├── retry.consumer.js            # Retry topic consumer
│   │   └── dlq.consumer.js              # DLQ consumer (or combined with retry)
│   ├── services/
│   │   ├── idempotency.service.js    # Idempotency key generation & checking
│   │   ├── retry.service.js          # Retry logic & exponential backoff
│   │   ├── dlq.service.js            # Dead letter queue service
│   │   └── template.service.js       # Template rendering with variable substitution
│   ├── controllers/
│   │   └── notification.controller.js # HTTP request/response handling
│   ├── routes/
│   │   ├── index.js                  # Route definitions & middleware setup
│   │   ├── notifications.routes.js   # POST /notifications/send route wiring
│   │   └── health.routes.js          # GET /health, GET /ready endpoints
│   ├── middlewares/
│   │   ├── auth.middleware.js        # API key validation (X-API-Key header)
│   │   ├── validation.middleware.js  # express-validator middleware
│   │   ├── correlation.middleware.js  # Correlation ID generation/extraction
│   │   └── swagger-auth.middleware.js # Basic auth for Swagger UI
│   ├── utils/
│   │   ├── logger.js                 # Structured JSON logging
│   │   └── errors.js                 # Custom error classes
│   ├── templates/
│   │   ├── email/
│   │   │   └── lab-reports.js       # Email templates for lab reports
│   │   ├── slack/
│   │   │   └── lab-reports.js       # Slack templates for lab reports
│   │   ├── webengage/
│   │   │   └── lab-reports.js       # WebEngage templates (future)
│   │   └── index.js                  # Template registry/loader
│   ├── infrastructure/
│   │   └── swagger.config.js         # Swagger/OpenAPI configuration
│   └── server.js                     # Express app initialization & startup
├── .env.example
├── .gitignore
├── package.json
├── README.md
├── IMPLEMENTATION_CHOICES.md
└── Dockerfile
```

**Rationale:**
- Clear separation of concerns (adapters, services, controllers, routes, middlewares)
- Channel adapters grouped together for easy extension
- Separate consumers for main, retry, and DLQ topics (industry standard)
- Services encapsulate business logic
- Controllers handle HTTP request/response
- Middlewares handle cross-cutting concerns
- Templates isolated for easy maintenance
- Swagger config in infrastructure layer

---

## 3. Environment Variables

### Required Variables

```bash
# Server Configuration
PORT=3005
NODE_ENV=development|staging|production
ENV_PREFIX=dev|stage|prod  # For topic prefixing

# Redis Configuration
REDIS_URI=redis://localhost:6379  # Required for idempotency

# Kafka Configuration
KAFKA_BOOTSTRAP_SERVERS=localhost:9092
KAFKA_CLIENT_ID=notification-service
KAFKA_CONSUMER_GROUP_ID=notification-service-group
KAFKA_SASL_MECHANISM=plain|scram-sha-256|scram-sha-512
KAFKA_SASL_USERNAME=your-username
KAFKA_SASL_PASSWORD=your-password
KAFKA_SSL_ENABLED=false|true
KAFKA_CONNECTION_TIMEOUT=10000
KAFKA_REQUEST_TIMEOUT=30000

# API Authentication
API_KEY=your-static-api-key-per-environment

# Slack Configuration
SLACK_BOT_TOKEN=xoxb-...
SLACK_DEFAULT_CHANNEL=C1234567890

# Email Configuration (Gmail SMTP)
EMAIL_SMTP_HOST=smtp.gmail.com
EMAIL_SMTP_PORT=587
EMAIL_SMTP_SECURE=false
EMAIL_SMTP_USER=your-email@gmail.com
EMAIL_SMTP_PASSWORD=your-app-password
EMAIL_FROM_NAME=Notification Service
EMAIL_FROM_ADDRESS=noreply@example.com

# Internal Events Platform
INTERNAL_EVENTS_BASE_URL=https://internal-events.example.com
INTERNAL_EVENTS_API_KEY=your-api-key
INTERNAL_EVENTS_TIMEOUT=5000

# Swagger Auth (optional, defaults for dev)
SWAGGER_USER=admin
SWAGGER_PASSWORD=admin123

# WebEngage (Future - placeholder)
# WEBENGAGE_BASE_URL=https://api.webengage.com
# WEBENGAGE_API_KEY=your-api-key
```

### Topic Naming Convention
- Primary topic: `{ENV_PREFIX}.notifications.events`
- Retry topic: `{ENV_PREFIX}.notifications.retry`
- DLQ topic: `{ENV_PREFIX}.notifications.dlq`

---

## 4. API Design

### Endpoint: `POST /notifications/send`

**Authentication:** `X-API-Key` header (static API key per environment)

**Request Validation (express-validator):**

**Required Fields:**
- `eventType` (string, enum: predefined event types)
- `channels` (array, min length: 1, enum: ["email", "slack", "webengage", "internal"])
- `recipients` (object, must contain at least one channel-specific array matching `channels`)
- `templateId` (string, must match existing template)
- `data` (object, template-specific data)

**Optional Fields:**
- `correlationId` (string, auto-generated if not provided)
- `priority` (string, enum: ["low", "normal", "high"], default: "normal")

**Recipients Structure:**
```javascript
{
  email: ["user@example.com"],           // Required if "email" in channels
  slackUsers: ["U12345"],                // Required if "slack" in channels
  webengageUsers: ["user123"],            // Required if "webengage" in channels
  internalEventTargets: ["target1"]      // Required if "internal" in channels
}
```

**Response:** `202 Accepted` (no delivery status returned synchronously)

### Swagger Documentation

**Endpoints:**
- `/api-docs` - Swagger UI (protected with Basic Auth)
- `/api-docs.json` - Raw Swagger JSON (protected with Basic Auth)

**Swagger Configuration:**
- OpenAPI 3.0.0 specification
- JSDoc comments in route files for auto-generation
- Common schemas: ApiResponse, ApiError
- Tags: Notifications, Health

---

## 5. Idempotency Implementation

### Key Generation
- **Algorithm:** SHA-256 hash of entire JSON payload (stringified, sorted keys)
- **Storage:** Redis with 24-hour TTL
- **Key Format:** `idempotency:{hash}`

### Flow
1. Generate hash of request payload
2. Check Redis for existing key
3. If exists → return `202 Accepted` (duplicate request)
4. If not exists → store in Redis, publish to Kafka

---

## 6. Retry Strategy

### Retry Topic Implementation
- **Approach:** Separate consumer group consuming from both `notifications.events` and `notifications.retry`
- **Retry Message Format:** Original payload + metadata (`retryCount`, `nextRetryAt`, `lastError`)
- **Backoff Check:** Consumer checks `nextRetryAt` timestamp before processing retry messages
- **Max Retries:** 5 attempts (configurable)

### Backoff Policy (Deterministic)
| Retry Attempt | Delay |
|--------------|-------|
| 1 | 1 minute |
| 2 | 5 minutes |
| 3 | 15 minutes |
| 4 | 30 minutes |
| 5 | 60 minutes |

### Failure Classification
- **Transient:** Slack API 5xx, 429, SMTP timeouts, network issues → Retry
- **Permanent:** Invalid user IDs, invalid emails, auth failures, template errors → DLQ

### DLQ Service
- **Purpose:** Store permanently failed notifications for manual inspection
- **Storage:** Kafka topic `notifications.dlq`
- **Metadata:** Original payload, error details, retry metadata, failure reason
- **No Automated Replay:** Manual inspection and audit only (v1)

---

## 7. Channel Implementations

### Slack Adapter
- **Library:** `@slack/web-api` (Slack SDK)
- **Configuration:** Bot token, default channel via env vars
- **User IDs:** Provided in payload (`recipients.slackUsers`)
- **Error Handling:** Classify 5xx/429 as transient, 4xx as permanent

### Email Adapter
- **Library:** `nodemailer`
- **SMTP:** Gmail SMTP (configurable via env vars)
- **Templates:** Inline template functions with variable substitution
- **Error Handling:** SMTP timeouts → transient, invalid email → permanent

### WebEngage Adapter
- **Status:** Placeholder for future implementation
- **Structure:** HTTP POST adapter ready, implementation deferred
- **Error Handling:** TBD

### Internal Events Platform Adapter
- **Library:** `axios`
- **Method:** Fire-and-forget HTTP POST
- **Retries:** Limited retries enabled (3 attempts)
- **Error Handling:** Network errors → transient, 4xx → permanent

---

## 8. Template System

### Implementation
- **Location:** `src/templates/` organized by channel
- **Structure:** Separate folders for each channel (email, slack, webengage, etc.)
- **Format:** JavaScript functions returning channel-specific objects
- **Variable Substitution:** Simple string replacement (`{{variableName}}`)
- **Template Selection:** By `templateId` and `channel` from request

### Template Organization
```
templates/
├── email/
│   └── lab-reports.js       # Email templates for lab report events
├── slack/
│   └── lab-reports.js       # Slack templates for lab report events
├── webengage/
│   └── lab-reports.js       # WebEngage templates (future)
└── index.js                  # Template registry/loader
```

### Example Template Files

**Email Template** (`templates/email/lab-reports.js`):
```javascript
module.exports = {
  lab_report_ready_v1: (data) => ({
    subject: `Lab Report Ready - ${data.reportId}`,
    html: `<p>Your lab report ${data.reportId} for SKU ${data.sku} is ready.</p>`,
    text: `Your lab report ${data.reportId} for SKU ${data.sku} is ready.`
  })
};
```

**Slack Template** (`templates/slack/lab-reports.js`):
```javascript
module.exports = {
  lab_report_ready_v1: (data) => ({
    text: `Lab Report Ready`,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Lab Report Ready*\nReport ID: ${data.reportId}\nSKU: ${data.sku}`
        }
      }
    ]
  })
};
```

**Template Registry** (`templates/index.js`):
- Loads templates from channel-specific folders
- Provides unified interface: `getTemplate(channel, templateId, data)`
- Handles template resolution and variable substitution

**Note:** Templates are inline JavaScript functions for v1. External template storage (Handlebars, remote storage) is deferred to future versions.

---

## 9. Logging

### Structured Logging
- **Format:** JSON logs
- **Fields:** `timestamp`, `level`, `message`, `correlationId`, `eventType`, `channels`, `source`, `error` (if applicable)
- **Log Levels:** Based on `NODE_ENV` (production: WARN+, development: INFO+)

### Correlation ID
- **Generation:** UUID v4 if not provided in request
- **Propagation:** Included in all logs, Kafka messages, and error traces
- **Header:** `X-Correlation-Id` (optional, auto-generated if missing)

---

## 10. Error Handling

### Error Classification
- **Transient Failures:** Retry via retry topic
- **Permanent Failures:** Route to DLQ immediately
- **All Failures:** Logged with correlation ID and error details

### Error Response
- **API Errors:** 400 (validation), 401 (auth), 500 (server error)
- **Kafka Errors:** Logged, not returned to client (async processing)

---

## 11. Health Check

### Endpoint: `GET /health`

**Response:**
```json
{
  "status": "healthy|degraded|unhealthy",
  "timestamp": "2024-01-01T00:00:00Z",
  "checks": {
    "redis": "connected|disconnected",
    "kafka": "connected|disconnected"
  }
}
```

**Status Logic:**
- **healthy:** Redis connected, Kafka connected
- **degraded:** Redis disconnected (idempotency disabled), Kafka connected
- **unhealthy:** Kafka disconnected

### Endpoint: `GET /ready`

**Response:**
```json
{
  "ready": true|false,
  "timestamp": "2024-01-01T00:00:00Z"
}
```

**Readiness Logic:**
- **ready:** Kafka producer connected, Kafka consumer connected
- Used by Cloud Run/Kubernetes for health checks

---

## 12. Deployment

### Cloud Run Configuration
- **Runtime:** Node.js 18+
- **Port:** From `PORT` env var (default: 3005)
- **Health Check:** `/health` endpoint
- **Readiness Check:** `/ready` endpoint
- **Scaling:** Default Cloud Run concurrency settings
- **Dockerfile:** Multi-stage build (optimized for production)

---

## 13. Testing

### Current Status
- **Unit Tests:** Not required for now
- **Integration Tests:** Not required for now
- **Future:** Test structure can be added later

---

## 14. Future Considerations

### WebEngage Integration
- Adapter structure ready
- Implementation deferred until requirements are clear
- Will follow same pattern as other channel adapters

### Additional Features (Out of Scope for v1)
- User preference management
- Delivery status APIs
- Advanced templating engine (Handlebars, remote templates)
- Scheduling/delayed notifications
- Metrics dashboards (Prometheus)
- Domain layer (notification entities, policies)

---

## 15. Key Design Decisions Summary

1. **Single Generic Endpoint:** Avoids endpoint explosion, supports future notification types
2. **Kafka for Reliability:** Decouples producers from delivery, enables retry handling
3. **Application-Level Retries:** More control than Kafka offset re-delivery
4. **Redis for Idempotency:** Prevents duplicate notifications from retries
5. **Channel Adapters:** Easy to add new channels without core changes
6. **Inline Templates:** Simple, no external dependencies, easy to maintain (v1)
7. **Structured Logging:** Better observability and debugging
8. **Correlation IDs:** Full request tracing across async boundaries
9. **Separate Consumers:** Clear separation for main, retry, and DLQ processing
10. **DLQ Service:** Explicit abstraction for permanent failure handling
11. **Swagger Documentation:** Auto-generated API docs for developer experience

---

**Document Version:** 1.0  
**Last Updated:** 2024
