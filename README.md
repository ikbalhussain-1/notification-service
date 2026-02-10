# Notification Service

Generic notification service for multi-channel notifications (Email, Slack, WebEngage, Internal Events) using Kafka and Redis.

## Features

- Multi-channel notifications (Email, Slack, WebEngage, Internal Events)
- Idempotency via Redis
- Application-level retries with exponential backoff
- Dead Letter Queue (DLQ) for permanent failures
- Kafka-based event processing
- REST API with Swagger documentation
- Health and readiness endpoints

## Getting Started

### Prerequisites

- Node.js 18+
- Redis
- Kafka (Google Managed Kafka or local)

### Installation

```bash
npm install
```

### Configuration

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

### Running

```bash
# Development
npm run dev

# Production
npm start
```

### API Documentation

Swagger UI available at: `http://localhost:3005/api-docs`

## API Endpoints

- `POST /notifications/send` - Send notification
- `GET /health` - Health check
- `GET /ready` - Readiness check

## Correlation ID Standard

This service uses the **`x-correlation-id`** HTTP header for request tracing across distributed systems.

### Usage

**For clients calling this service:**
- Include the `x-correlation-id` header in your HTTP requests
- The service will use your provided correlation ID, or generate a new UUID if not provided
- The correlation ID is returned in the response header `X-Correlation-Id`

**Example:**
```bash
curl -X POST http://localhost:3005/notifications/send \
  -H "x-correlation-id: abc-123-def-456" \
  -H "Content-Type: application/json" \
  -d '{ ... }'
```

**Benefits:**
- Track a single request across all services and Kafka topics
- Debug issues by filtering logs by correlation ID
- Maintain trace continuity from upstream services through notification processing
