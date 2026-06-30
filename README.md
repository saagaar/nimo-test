# Nimo Crypto Price Notification System

Serverless AWS application that fetches real-time cryptocurrency prices, records each search per user, and delivers email price alerts — built with Node.js 24, AWS Lambda, DynamoDB, and SES.

---

## Table of Contents

- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Tech Stack](#tech-stack)
- [How It Works](#how-it-works)
- [API Reference](#api-reference)
- [Email Notifications](#email-notifications)
- [Security](#security)
- [Data Model](#data-model)
- [Local Development](#local-development)
- [Testing](#testing)
- [CI/CD](#cicd)
- [Deployment](#deployment)
- [Future Enhancements](#future-enhancements)
- [Design Decisions](#design-decisions)

---

## Architecture

Two Lambda functions sit behind a single API Gateway. They share one DynamoDB table — price service writes, history service reads.
```
Client
  ↓
API Gateway  (throttled: 10 req/s steady, 20 burst)
  ├── GET /price  →  PriceFunction (Lambda)
  │                    ├── CoinGecko API       (fetch price)
  │                    ├── DynamoDB            (write search record)
  │                    └── AWS SES             (fire-and-forget email)
  │
  └── GET /history  →  HistoryFunction (Lambda)
                         └── DynamoDB          (read search records)
```
Both functions are stateless and independently deployable. The email call is fire-and-forget — SES failures never affect the price API response.

---

## Project Structure

```
nimo-test/
├── crypto-price-service/       # Lambda: GET /price
│   ├── scripts/
│   │   └── test-email.js       # SES smoke test — verify email sending in isolation
│   └── src/
│       ├── handlers/           # Lambda entry point (thin — parse, call service, respond)
│       ├── services/           # Business logic (price lookup, dedup check, email trigger)
│       ├── repositories/       # DynamoDB reads and writes
│       ├── clients/            # CoinGecko, DynamoDB, SES SDK wrappers
│       ├── validators/         # Zod request schemas
│       ├── shared/             # Logger, error classes, response helpers
│       └── config/             # Environment variable config
│
├── search-history-service/     # Lambda: GET /history
│   └── src/
│       ├── handlers/
│       ├── services/
│       ├── repositories/
│       ├── clients/
│       ├── validators/
│       ├── shared/
│       └── config/
│
├── infra/
│   └── template.yaml           # AWS SAM template (Lambda, API Gateway, DynamoDB)
├── env.local.json              # Local env vars for sam local start-api (not committed)
├── .github/
│   └── workflows/
│       └── ci-cd.yml           # GitHub Actions CI/CD pipeline
├── eslint.config.js            # Shared ESLint config (both services)
├── .prettierrc                 # Shared Prettier config
├── commitlint.config.js        # Conventional Commits enforcement
├── package.json                # Root: dev tooling only (ESLint, Prettier, Husky, Vitest)
└── .nvmrc                      # Node.js v24.18.0
```

Each service has its own `package.json` for **production dependencies only**. Dev tooling lives exclusively at the root.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 24 (`nodejs24.x`) |
| Compute | AWS Lambda |
| API | AWS API Gateway |
| Database | AWS DynamoDB (PAY_PER_REQUEST, SSE enabled) |
| Email | AWS SES |
| Infrastructure | AWS SAM (CloudFormation) |
| External pricing | CoinGecko API |
| Validation | Zod |
| Testing | Vitest |
| CI/CD | GitHub Actions |
| Linting | ESLint + Prettier |
| Commits | Conventional Commits (commitlint + Husky) |

---

## How It Works

### GET /price — full request flow

```
handler (price.js)
  └── validatePriceRequest()          Zod: coin (string), email (valid email)
  └── savePriceHistoryService()
        ├── getCoinPrice(coin)         CoinGecko REST API → { coin, currency, price }
        ├── findRecentSearch(...)      DynamoDB Query: same userId+coin within 5 min
        ├── saveSearchHistory(...)     DynamoDB PutItem: writes the record, returns searchedAt
        └── if no recent search:
              emailNotificationService.send(...)   fire-and-forget (.catch → warn log)
  └── respond 200 { coin, currency, price, searchedAt }
```

**Key detail — dedup before write:** `findRecentSearch` runs before `saveSearchHistory`. The dedup check reads the state before the current request is persisted, so a concurrent duplicate request within milliseconds could result in two emails being sent. This is an acceptable edge case for a notification system (two emails is better than a missed write).

### GET /history — full request flow

```
handler (getHistory.js)
  └── validateHistoryRequest()        Zod: email (valid email)
  └── getHistoryService({ email })
        └── getSearchHistory(email)   DynamoDB Query: userId = email, ScanIndexForward: false
  └── respond 200 { items: [...], count: N }
```

### Layer responsibilities

| Layer | Responsibility | Example files |
|-------|---------------|---------------|
| `handlers/` | Parse event, call service, map to HTTP response | `price.js`, `getHistory.js` |
| `services/` | Orchestrate the use case — no AWS SDK calls | `priceService.js`, `historyService.js` |
| `repositories/` | DynamoDB access only | `historyRepository.js` (both services) |
| `clients/` | External API / AWS SDK wrappers | `coinGeckoClient.js`, `sesClient.js`, `dynamoDbClient.js` |
| `validators/` | Zod schemas, throw `ValidationError` on bad input | `priceValidator.js`, `historyValidator.js` |
| `config/` | Read environment variables, single source of truth | `config/index.js` |
| `shared/` | Logger, error classes, response builder | `logger.js`, `errors.js`, `response.js` |

---

## API Reference


### Base URLs

| Environment | URL |
|-------------|-----|
| Local (`sam local`) | `http://localhost:3000` |
| AWS Production | `https://1e64rdz9k3.execute-api.ap-southeast-2.amazonaws.com/Prod/` |

---

### GET /price

Fetches the current price of a cryptocurrency, records the search in DynamoDB, and sends an email notification.

**Query parameters**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `coin` | string | Yes | Cryptocurrency name (e.g. `bitcoin`, `ethereum`, `solana`) |
| `email` | string | Yes | User email — used for search history and email notifications |

**Example**

```bash
curl "https://1e64rdz9k3.execute-api.ap-southeast-2.amazonaws.com/Prod/price?coin=bitcoin&email=user@example.com"
```

**200 Response**

```json
{
  "success": true,
  "data": {
    "coin": "bitcoin",
    "currency": "usd",
    "price": 105432.12,
    "searchedAt": "2026-06-30T10:00:00.000Z"
  }
}
```

---

### GET /history

Returns all cryptocurrency searches made by a user, sorted newest first.

**Query parameters**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `email` | string | Yes | Email address of the user |

**Example**

```bash
curl "https://1e64rdz9k3.execute-api.ap-southeast-2.amazonaws.com/Prod/history?email=user@example.com"
```

**200 Response**

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
        "searchedAt": "2026-06-30T10:15:00.000Z"
      }
    ],
    "count": 1
  }
}
```

Returns `{ "items": [], "count": 0 }` for users with no history.

---

### Error responses

| Status | Cause |
|--------|-------|
| `400` | Missing or invalid query parameter |
| `500` | Unexpected internal error |
| `502` | CoinGecko API or DynamoDB unavailable |

```json
{
  "success": false,
  "error": {
    "message": "Coin is required"
  }
}
```
---

## Email Notifications

Every successful `/price` request triggers an email to the requesting user via AWS SES. The call is fire-and-forget — it runs after the DynamoDB write and never blocks or delays the API response. SES failures are logged as warnings; the price response always returns 200.

### Email delivery flow

```
priceService.js
  ↓
emailNotificationService.send(...)     formats subject + plain-text body
  ↓
sesClient.sendEmail(...)               calls AWS SDK SendEmailCommand
  ↓
SES                                    delivers to inbox
```

`sesClient.js` reads the sender address from `config.emailFromAddress` (the `EMAIL_FROM_ADDRESS` environment variable). The address must be verified in SES before emails are delivered.

### Deduplication (5-minute window)

To prevent spam, at most one email is sent per `(email, coin)` pair within any 5-minute window. Before sending, the service queries DynamoDB for a recent search by the same user for the same coin. If one exists within the window, the email is skipped.

```
priceService.js — EMAIL_DEDUP_WINDOW_MINUTES = 5

fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()

findRecentSearch({
  userId: email,
  coin,
  currency,
  since: fiveMinutesAgo      ← KeyConditionExpression: searchedAt >= :since
})

if (recentSearch)  → skip email, log info
else               → fire-and-forget send
```

Example behaviour:

```
User searches bitcoin              → email sent ✓
User searches bitcoin 2 min later  → skipped (within 5-min window)
User searches ethereum same time   → email sent ✓ (different coin)
User searches bitcoin 6 min later  → email sent ✓ (window expired)
```

---
## Code Quality and Engineering Practices Implemented

### Layered Architecture

The codebase follows a clear separation of concerns:

- **Handlers** handle API Gateway/Lambda events.
- **Validators** validate incoming request parameters.
- **Services** coordinate business logic.
- **Repositories** handle database access.
- **Clients** encapsulate external integrations such as CoinGecko, DynamoDB, and SES.

This keeps Lambda handlers small and makes the application easier to test, maintain, and extend.

### Centralized Error Handling

The application uses shared custom error classes such as `ValidationError`, `NotFoundError`, and `ExternalServiceError`.

Errors are converted into consistent API responses using a shared response helper. This ensures all endpoints return the same response format for both success and failure cases.

### Structured Logging

A shared logger is used across the application to produce consistent structured logs.

Logs include useful metadata such as request ID, user ID, coin, and operation context. This makes debugging easier in both local development and Amazon CloudWatch.

### Request Validation

Request validation is handled before business logic runs.

The application validates required query parameters such as `coin`, `email`, and `userId`, returning clear `400 Bad Request` responses when input is invalid.

### External Service Abstraction

External systems are wrapped in dedicated client modules.

For example, CoinGecko API access is isolated inside a CoinGecko client, while DynamoDB access is isolated inside repository modules. This prevents third-party implementation details from leaking into business logic.

### DynamoDB Access Pattern

DynamoDB operations are handled through repository functions.

The application uses a query-first design with `userId` as the partition key and `searchedAt` as the sort key, allowing efficient retrieval of user search history without scanning the table.

### Reusable Shared Utilities

Common functionality such as logging, response formatting, error classes, and configuration helpers is kept in shared modules.

This reduces duplication and keeps both microservices consistent.

### Environment-Based Configuration

Configuration values are read from environment variables.

This allows the same codebase to run locally with DynamoDB Local and in AWS with managed DynamoDB without code changes.

### Minimal IAM Permissions

Lambda functions are granted only the permissions they need.

For example, the price service has permission to write search history, while the history service only has permission to query search history.

### Non-Blocking Email Flow

Email notification is handled separately from the main price response path.

This ensures that email delivery issues do not block the API response or prevent price/history data from being saved.
## Security

### Least-privilege IAM

Each Lambda has a minimal inline policy scoped to the exact DynamoDB table ARN:

| Function | Permission |
|----------|-----------|
| `PriceFunction` | `dynamodb:PutItem` only |
| `HistoryFunction` | `dynamodb:Query` only |

`PriceFunction` also has `ses:SendEmail` scoped to verified SES identities in the account (`arn:aws:ses:region:account:identity/*`) — not a wildcard resource.

### API Gateway throttling

Enforced at the stage level across all endpoints:

- **Steady-state:** 10 requests/second
- **Burst cap:** 20 requests (token-bucket)

Clients exceeding the limit receive `HTTP 429` automatically.

### DynamoDB encryption at rest

The `CryptoSearchHistory` table has `SSEEnabled: true` with an AWS-managed KMS key. Explicitly declared in the SAM template rather than relying on the default.

### Input validation

All query parameters are validated with Zod before reaching business logic. Invalid or missing parameters return a structured `400 ValidationError`. No raw error details or stack traces are exposed to the caller.


---

## Data Model

**Table:** `CryptoSearchHistory`

| Attribute | Type | Role |
|-----------|------|------|
| `userId` | String | Partition key (stores the user's email address) |
| `searchedAt` | String (ISO 8601) | Sort key |
| `coin` | String | Cryptocurrency identifier |
| `currency` | String | Fiat currency code |
| `price` | Number | Price at time of search |
| `email` | String | Email address (same value as `userId`, kept for readability) |

Records are queried by `userId` and sorted by `searchedAt` descending (`ScanIndexForward: false`) — no additional index needed.

The `findRecentSearch` function uses `KeyConditionExpression: 'userId = :userId AND searchedAt >= :since'` with a `FilterExpression` on `coin` and `currency`. This leverages the sort key range directly rather than requiring a Global Secondary Index.

---

## Local Development

### Prerequisites

- Node.js 24 (`nvm use` reads `.nvmrc`)
- AWS CLI configured
- AWS SAM CLI
- Docker (for DynamoDB Local)

### Setup

```bash
# 1. Install dev tooling and wire git hooks
npm install

# 2. Install production dependencies for each service
cd crypto-price-service && npm install
cd ../search-history-service && npm install
```

### Running locally

```bash
# Start DynamoDB Local (Docker)
docker run -p 8000:8000 amazon/dynamodb-local

# Start both Lambdas via SAM
sam local start-api -t infra/template.yaml --env-vars env.local.json
```

`env.local.json` supplies `HISTORY_TABLE_NAME`, `DYNAMODB_ENDPOINT`, `AWS_REGION`, and `EMAIL_FROM_ADDRESS` to each function without touching the SAM template.

```bash
# Test price endpoint
curl "https://1e64rdz9k3.execute-api.ap-southeast-2.amazonaws.com/Prod/price?coin=bitcoin&email=user@example.com"

# Test history endpoint
curl "https://1e64rdz9k3.execute-api.ap-southeast-2.amazonaws.com/Prod/history?email=user@example.com"
```

### Linting and formatting

```bash
npm run lint          # ESLint across both services
npm run lint:fix      # Auto-fix
npm run format        # Prettier across both services
```
---

## Testing

**Framework:** [Vitest](https://vitest.dev/) — native ESM support, same API as Jest.

```bash
npm test              # both services
npm run test:price    # crypto-price-service only
npm run test:history  # search-history-service only
```

No AWS credentials or running services required. Each service has its own `vitest.config.js` with `root: __dirname` to correctly resolve the `#src` path alias from each service directory.

### Test coverage (18 tests)

#### Validators — pure unit, zero mocks

| # | Test | Service |
|---|------|---------|
| 1 | Missing `coin` → `ValidationError` | price |
| 2 | Missing `email` → `ValidationError` | price |
| 3 | Invalid email format → `ValidationError` | price |
| 4 | Valid `coin` + `email` → returns parsed data | price |
| 5 | Missing `email` → `ValidationError` | history |
| 6 | Invalid email format → `ValidationError` | history |
| 7 | Valid email → returns `{ email }` | history |

#### priceService — business logic, mocked dependencies

| # | Scenario | Assert |
|---|----------|--------|
| 8 | No recent search → email IS sent | `emailNotificationService.send` called once with correct args |
| 9 | Recent search within 5 min → email skipped | `emailNotificationService.send` NOT called |
| 10 | `getCoinPrice` throws `ExternalServiceError` | error propagates; `saveSearchHistory` never called |
| 11 | `saveSearchHistory` throws `ExternalServiceError` | error propagates to handler |
| 12 | Dedup window wiring | `findRecentSearch` receives `since` within `±1s` of `now − 5min` |

Test #12 is the key invariant — it proves the 5-minute dedup timestamp is computed and passed correctly, not just that the branch exists.

#### Handlers — HTTP contract, mocked service layer

| # | Scenario | Status |
|---|----------|--------|
| 13 | `queryStringParameters: null` | 400 (no crash) |
| 14 | `ValidationError` from validator | 400 |
| 15 | `ExternalServiceError` from service | 502 |
| 16 | Success | 200 with correct price data |
| 17 | Missing `email` in history request | 400 |
| 18 | Empty history (new user) | 200 with `{ items: [], count: 0 }` |

---

## CI/CD

Two-job GitHub Actions pipeline defined in `.github/workflows/ci-cd.yml`.

```
Every push / PR to any branch
        ↓
    ci job
    ├── npm ci (root + each service)
    ├── npm run lint
    ├── npm test
    └── sam validate --lint

Push to main (after ci passes)
        ↓
    deploy job
    ├── sam build -t infra/template.yaml
    └── sam deploy (--resolve-s3, --parameter-overrides EmailFromAddress=...)
```

### GitHub Secrets required

| Secret | Description |
|--------|-------------|
| `AWS_ACCESS_KEY_ID` | Access key for the deployment IAM user |
| `AWS_SECRET_ACCESS_KEY` | Secret key for the deployment IAM user |
| `EMAIL_FROM_ADDRESS` | SES-verified sender email address |

The deployment user needs CloudFormation, Lambda, DynamoDB, IAM, SES, and S3 permissions (`--resolve-s3` auto-manages the artifact bucket).

---

## Deployment

### SES prerequisite

Before deploying, verify your sender email in the SES console:

```
SES Console → Verified identities → Create identity → Email address
```

In SES sandbox mode, the recipient address must also be verified. Request production access to send to any address.

### First-time deploy (guided)

```bash
sam build -t infra/template.yaml
sam deploy --guided \
  --parameter-overrides EmailFromAddress=your-verified@email.com
```
### Subsequent deploys

```bash
sam build -t infra/template.yaml
sam deploy \
  --stack-name nimo-crypto \
  --region ap-southeast-2 \
  --capabilities CAPABILITY_IAM \
  --no-confirm-changeset \
  --no-fail-on-empty-changeset \
  --resolve-s3 \
  --parameter-overrides EmailFromAddress=your-verified@email.com
```
After deploy, retrieve the API URL:

```bash
aws cloudformation describe-stacks \
  --stack-name nimo-crypto \
  --region ap-southeast-2 \
  --query "Stacks[0].Outputs[?OutputKey=='ApiUrl'].OutputValue" \
  --output text
```
---

## Future Improvements

### 1. SQS-based async email worker

Replace the in-Lambda SES call with an SQS FIFO queue publish. A dedicated `EmailWorkerLambda` consumes the queue and calls SES. Benefits:

- Lambda response time is unaffected even if SES is slow
- Built-in retry and backoff via SQS visibility timeout
- Dead Letter Queue (DLQ) captures failed sends for inspection
- SQS FIFO deduplication IDs replace the DynamoDB `findRecentSearch` query

### 2. API Key authentication

The API is currently public, protected only by throttling. Adding API Gateway usage plans and API keys would allow:

- Per-consumer rate limits and quotas independent of the global throttle
- Auditing of per-key usage in CloudWatch
- Key revocation without affecting other consumers

The `x-api-key` header would be required on all requests; missing or invalid keys return `HTTP 403`. No Cognito or JWT overhead needed for a server-to-server API.

### 3. Distributed data stores per microservice

Both services currently share a single DynamoDB table. True microservice independence means each service owns its data:

| Service | Table | Access |
|---------|-------|--------|
| `crypto-price-service` | `PriceWriteTable` | Write-only |
| `search-history-service` | `HistoryReadTable` | Read-only |

**Sync via DynamoDB Streams:**

```
PriceFunction writes → PriceWriteTable
                              ↓
                    DynamoDB Stream (NEW_IMAGE)
                              ↓
                    SyncLambda (stream consumer)
                              ↓
                    HistoryReadTable (eventual consistency, ms lag)
```

Sync failures are caught by a DLQ on the stream consumer — no data loss.


### 5. Observability

- Structured logs already use a consistent JSON format with `level`, `timestamp`, `message`, and `metadata` fields — ready to query in CloudWatch Insights.
- Future: CloudWatch alarms on Lambda error rate and P99 duration, X-Ray traces per request, and a dashboard for CoinGecko error rate and SES send/skip counts.

### 6. Pagination for history

The `/history` endpoint returns all records for a user. For users with many searches, add `limit` and `cursor` query parameters backed by DynamoDB's `ExclusiveStartKey` for cursor-based pagination — no full-table scans needed.

---

## Design Decisions

| Decision | Rationale |
|----------|-----------|
| CommonJS → ESM (`"type": "module"`) | Native Node.js 24 module format; no transpile step; enables top-level `await` |
| Zod for validation | Declarative schemas, typed output, first-class ESM support |
| Fire-and-forget email | SES latency should never add to the price API response time |
| DynamoDB dedup query instead of in-memory Map | Survives Lambda cold starts and scales across concurrent instances; in-memory state resets on cold start |  
| Dedup check before write | Reads state before persisting so the check is clean; acceptable edge case: two near-simultaneous requests may both send an email |
| `userId` as partition key (stores email) | Matches DynamoDB convention for user-scoped data; `email` attribute kept alongside for readability |
| Shared `package.json` for dev tooling | Single ESLint/Prettier/Husky/Vitest config; no duplication across services |
| `sam validate --lint` in CI | Catches CloudFormation errors before any AWS API call is made |
| `--resolve-s3` in SAM deploy | No manual S3 bucket management; SAM handles the artifact bucket lifecycle |
| `PAY_PER_REQUEST` DynamoDB billing | No capacity planning needed; scales to zero at rest |
| `EmailFromAddress` as SAM parameter | Keeps secrets out of the template; injected via GitHub Secret at deploy time |

---

## Author

Built by Sagar Chapagain.
