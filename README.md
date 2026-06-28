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

- Triggered asynchronously from Price Service
- Uses SQS/EventBridge
- Processed by a Lambda worker
- Sends email via AWS SES
- Does not block API response

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
