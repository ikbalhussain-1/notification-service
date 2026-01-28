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

## Architecture

See [IMPLEMENTATION_CHOICES.md](./IMPLEMENTATION_CHOICES.md) for detailed architecture and design decisions.
