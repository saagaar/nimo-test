# Nimo Crypto Price Notification System

## Overview

This project is a serverless AWS application built using Node.js that allows users to:

- Fetch current cryptocurrency prices
- Store each search in a history database
- Send an email notification with the price asynchronously
- Retrieve historical search data

The system is built using a microservice architecture and deployed entirely on AWS serverless services.

---

## Architecture

This system contains **two microservices only**:

### 1. Price Service (Core Service)
- Fetches real-time crypto price from CoinGecko API
- Stores search data in DynamoDB
- Triggers asynchronous email workflow via SQS/EventBridge
- Does NOT wait for email to complete

### 2. History Service
- Retrieves stored search history from DynamoDB

---

## Email Processing (Async Worker - NOT a microservice)

Email sending is handled asynchronously as part of the system workflow:

- Triggered via SQS/EventBridge from Price Service
- Processed by a Lambda function
- Sends email using AWS SES
- Runs independently of API response

---

## Architecture Flow

Client
  ↓
API Gateway
  ↓
Price Service (Lambda)
  ├── CoinGecko API
  ├── DynamoDB (write history)
  └── EventBridge / SQS (trigger email async)
          ↓
     Email Worker Lambda
          ↓
        AWS SES

History Service
  ↓
DynamoDB (read)

---

## Tech Stack

- Node.js 22
- AWS Lambda
- API Gateway
- DynamoDB
- SQS / EventBridge
- AWS SES
- AWS SAM (Infrastructure as Code)
- GitHub Actions (CI/CD)

---

## Project Structure

services/
  price-service/
  history-service/

workers/
  email-worker/

shared/
  logger.js
  errors.js
  response.js
  config.js

infra/
  template.yaml

.github/workflows/
  deploy.yml

CLAUDE.md
package.json
.nvmrc

---

## API Endpoints

### Get Crypto Price

GET /price?coin=bitcoin&email=user@example.com

Response:
{
  "success": true,
  "data": {
    "coin": "bitcoin",
    "price": 65000,
    "currency": "usd"
  }
}

---

### Get Search History

GET /history?userId=123

Response:
{
  "success": true,
  "data": [
    {
      "coin": "bitcoin",
      "price": 65000,
      "timestamp": "2026-06-26T10:00:00Z"
    }
  ]
}

---

## Key Design Decisions

- Only two microservices for simplicity and clarity
- Email is treated as an asynchronous workflow, not a standalone microservice
- Serverless-first architecture using AWS Lambda
- Event-driven email processing for scalability
- Stateless Lambda functions
- DynamoDB as single source of truth

---

## Data Model

DynamoDB Table: CryptoSearchHistory

Partition Key: userId  
Sort Key: timestamp  

Attributes:
- coin
- price
- email
- createdAt

---

## Email Workflow

Every successful `/price` lookup triggers an email notification to the requesting user via AWS SES. The notification is fire-and-forget — it never blocks or delays the price API response.

### Deduplication

To prevent email spam, each `(email, coin)` pair is rate-limited to **one email per 5 minutes**. If the same user searches for the same cryptocurrency again within that window, the email is silently skipped and a log entry is written instead.

```
User searches bitcoin → email sent ✓
User searches bitcoin again (2 min later) → skipped, already sent within 5 min
User searches ethereum (same time) → email sent ✓  (different coin)
User searches bitcoin again (6 min later) → email sent ✓  (window expired)
```

The deduplication window is tracked in memory on the Lambda instance. It resets on a cold start, which is acceptable for a 5-minute window.

### Future: SQS-based async email

The current implementation calls SES directly inside the Lambda. The planned upgrade is to publish to an SQS queue instead, with a dedicated `EmailWorkerLambda` consuming it. Only one line in `priceService.js` changes; the rest of the architecture stays the same.

---

## Error Handling

- Centralized error handling strategy
- Structured API responses
- External API failures handled safely
- No sensitive data exposed

---

## Validation

- Input validation for API requests
- Environment variable validation at startup
- External API response validation

---

## CI/CD Pipeline

- GitHub Actions used for deployment
- Steps:
  - Install dependencies
  - Lint code
  - Build SAM application
  - Deploy to AWS

---

## Deployment

Prerequisites:
- AWS CLI configured
- AWS SAM CLI installed
- Node.js 22+

Commands:

sam build
sam deploy --guided

---

## Assumptions

- User identification via email or userId
- No authentication layer implemented
- Email is asynchronous for performance reasons
- CoinGecko API used for pricing

---

## Future Improvements

- Add authentication (Cognito)
- Add caching layer (Redis)
- Add DLQ for email failures
- Add rate limiting
- Add observability dashboards

---

## Author

Built as part of a serverless AWS engineering exercise.

..............................................Documentation generated............................................

# API Endpoints

The application exposes two REST API endpoints through AWS API Gateway.

## Base URL

### Local Development

```text
http://localhost:3000
```

### AWS Deployment

Replace `<api-id>` and `<region>` with the values generated after deployment.

```text
https://<api-id>.execute-api.<region>.amazonaws.com/Prod
```

---

# 1. Get Cryptocurrency Price

Retrieves the current cryptocurrency price from CoinGecko, stores the search history in DynamoDB, and returns the latest price.

### Endpoint

```http
GET /price
```

### Query Parameters

| Parameter | Type   | Required | Description                                           |
| --------- | ------ | -------- | ----------------------------------------------------- |
| coin      | string | Yes      | Cryptocurrency name (e.g. bitcoin, ethereum, solana). |
| email     | string | Yes      | Email address used to associate the search history.   |

### Example Request

```http
GET /price?coin=bitcoin&email=user@example.com
```

### Successful Response

```json
{
  "success": true,
  "message": "Cryptocurrency price retrieved successfully.",
  "data": {
    "coin": "Bitcoin",
    "currency": "usd",
    "price": 105432.12
  }
}
```

---

# 2. Retrieve Search History

Returns the cryptocurrency search history for a user.

### Endpoint

```http
GET /history
```

### Query Parameters

| Parameter | Type   | Required | Description                                         |
| --------- | ------ | -------- | --------------------------------------------------- |
| userId    | string | Yes      | User identifier used as the DynamoDB partition key. |

> If your implementation uses the user's email as the partition key, replace `userId` with `email`.

### Example Request

```http
GET /history?userId=user@example.com
```

### Successful Response

```json
{
  "success": true,
  "message": "Search history retrieved successfully.",
  "data": [
    {
      "coin": "Bitcoin",
      "currency": "usd",
      "price": 105432.12,
      "searchedAt": "2026-06-28T12:15:30.000Z"
    },
    {
      "coin": "Ethereum",
      "currency": "usd",
      "price": 2540.48,
      "searchedAt": "2026-06-28T12:18:42.000Z"
    }
  ]
}
```

---

# Error Responses

| Status Code | Description                                                     |
| ----------- | --------------------------------------------------------------- |
| 400         | Invalid request parameters.                                     |
| 404         | Cryptocurrency not found.                                       |
| 500         | Internal server error.                                          |
| 502         | Failed to communicate with the external cryptocurrency service. |

---

# Implementation Notes

## Actual Response Format

The history endpoint returns a paginated envelope — not a flat array — so callers always know the record count without parsing:

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "userId": "user@example.com",
        "coin": "bitcoin",
        "currency": "usd",
        "price": 105432.12,
        "searchedAt": "2026-06-28T12:15:30.000Z"
      }
    ],
    "count": 1
  }
}
```

Results are sorted **newest first** (`ScanIndexForward: false`) at the database level.

## DynamoDB Sort Key

The DynamoDB sort key is `searchedAt` (ISO 8601 string), not `timestamp`. Records are queried by `userId` (partition key = email address) and sorted by `searchedAt`.

## Runtime

Both Lambda functions run on **Node.js 24** (`nodejs24.x`).

---

# Security Features Implemented

The following security controls are active in the current deployment — not future work.

## API Gateway Throttling

A rate limit is enforced at the API Gateway stage level across all endpoints:

- **Steady-state:** 10 requests per second
- **Burst cap:** 20 concurrent requests (token-bucket)

Any client exceeding this receives `HTTP 429 Too Many Requests` automatically. This is configured via `MethodSettings` on the `NimoApi` resource in `infra/template.yaml`.

## Least-Privilege IAM

Each Lambda has a minimal inline IAM policy scoped to the exact table ARN:

| Function | Permissions granted |
|----------|-------------------|
| `PriceFunction` | `dynamodb:PutItem` only |
| `HistoryFunction` | `dynamodb:Query` only |

Neither function can scan, delete, or describe the table.

## DynamoDB Encryption at Rest

The `CryptoSearchHistory` table has `SSEEnabled: true` with an AWS-managed KMS key. Encryption is explicitly declared in the template rather than relying on the silent default.

## Input Validation

All incoming query parameters are validated with Zod before reaching business logic. Invalid or missing parameters return a structured `400 ValidationError` — no raw errors are exposed to the caller.

---

# Future Enhancements

## Email Notifications via SQS (Async)

Email sending is architecturally planned but not yet implemented. The intended design:

1. After saving the search to DynamoDB, `PriceFunction` publishes an event to an SQS queue (or EventBridge).
2. A separate `EmailWorkerLambda` consumes the queue and sends the email via AWS SES.
3. The API response is never blocked waiting for the email — it returns immediately after the DynamoDB write.

**Idempotency:** To avoid sending duplicate emails for repeated searches of the same cryptocurrency, the email worker will check whether a notification was already sent for the same `(userId, coin, date)` combination before dispatching. This can be enforced with a DynamoDB conditional write on a separate `EmailsSent` tracking table, or by using SQS message deduplication IDs on a FIFO queue.

## API Key Authentication

The API is currently public with only throttling as a guard. For production, API Gateway usage plans and API keys would be added:

- Each consumer (client application or partner) receives a unique API key.
- Usage plans set per-key rate limits and quotas independently of the global throttle.
- The `x-api-key` header is required on every request; missing or invalid keys return `HTTP 403`.
- This allows auditing per-client usage and revoking individual keys without affecting others.

No Cognito or JWT-based auth is needed for this use case — API keys are sufficient for server-to-server access control on a public data API.

## Distributed Databases per Microservice

Currently both services share the single `CryptoSearchHistory` table. In a production microservice architecture each service should own its own data store independently.

**Proposed setup:**

| Service | Owns | Access |
|---------|------|--------|
| `crypto-price-service` | `PriceWriteTable` | Write-only |
| `search-history-service` | `HistoryReadTable` | Read-only |

**Synchronization strategy — DynamoDB Streams:**

```
PriceFunction writes → PriceWriteTable
                              ↓
                    DynamoDB Stream (new image)
                              ↓
                    SyncLambda (triggered by stream)
                              ↓
                    HistoryReadTable (eventual consistency)
```

- `PriceWriteTable` enables a DynamoDB Stream on `NEW_IMAGE`.
- A lightweight `SyncLambda` consumes the stream and writes the record into `HistoryReadTable`.
- `search-history-service` only ever reads from its own table — it has no knowledge of the write side.
- This pattern is **eventually consistent**: history may lag by milliseconds but the write API is never blocked.
- Failures in the sync are handled via a Dead Letter Queue (DLQ) on the stream consumer — no data is lost.

## Test Coverage

Test coverage is intentionally minimal for this take-home. The target for a production version would be:

| Layer | Test type | Coverage goal |
|-------|-----------|--------------|
| Validators | Unit (Zod schema edge cases) | 100% |
| Services | Unit (mock repository) | 100% |
| Repositories | Integration (DynamoDB Local) | Key paths |
| Handlers | Integration (SAM local invoke) | Happy path + error cases |
| End-to-end | E2E via `sam local start-api` | Critical flows |

Priority test cases:
- Missing required query parameters → 400
- Invalid email format → 400
- DynamoDB unavailable → 502 (not 500)
- Empty history (new user) → 200 with `count: 0`
- Results are returned newest-first
