# Nimo Crypto Price Notification System

Serverless AWS application that fetches real-time cryptocurrency prices, records each search per user, and delivers email price alerts — built with Node.js 24, AWS Lambda, DynamoDB, and SES.

---

## Table of Contents

- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Tech Stack](#tech-stack)
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
├── shared/                     # Cross-service constants and utilities
├── docs/
│   └── openapi.yaml            # OpenAPI 3.0 spec
├── infra/
│   └── template.yaml           # AWS SAM template (Lambda, API Gateway, DynamoDB)
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

## API Reference

**Interactive docs (Swagger UI):**
[Open in Swagger Editor](https://editor.swagger.io/?url=https://raw.githubusercontent.com/saagaar/nimo-test/main/docs/openapi.yaml)

The full OpenAPI 3.0 spec is at [`docs/openapi.yaml`](docs/openapi.yaml).

### Base URLs

| Environment | URL |
|-------------|-----|
| Local (`sam local`) | `http://localhost:3000` |
| AWS Production | `https://<api-id>.execute-api.ap-southeast-2.amazonaws.com/Prod` |

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
curl "https://<api-url>/Prod/price?coin=bitcoin&email=user@example.com"
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
curl "https://<api-url>/Prod/history?email=user@example.com"
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

### Deduplication (5-minute window)

To prevent spam, at most one email is sent per `(email, coin)` pair within any 5-minute window. Before sending, the service queries DynamoDB for a recent search by the same user for the same coin. If one exists within the window, the email is skipped.

```
User searches bitcoin        → email sent ✓
User searches bitcoin 2 min later → skipped (within 5-min window)
User searches ethereum same time  → email sent ✓ (different coin)
User searches bitcoin 6 min later → email sent ✓ (window expired)
```

### Future: SQS-based decoupled email

The current design calls SES synchronously (fire-and-forget) from inside the Lambda. The planned upgrade decouples this entirely:

1. `PriceFunction` publishes a message to an SQS FIFO queue after the DynamoDB write.
2. A dedicated `EmailWorkerLambda` consumes the queue and calls SES.
3. SQS message deduplication IDs replace the DynamoDB lookup for dedup.

Only one line in `priceService.js` changes when this is implemented — the `EmailNotificationService` class and its callers remain untouched.

---

## Security

The following controls are active in the current deployment.

### Least-privilege IAM

Each Lambda has a minimal inline policy scoped to the exact DynamoDB table ARN:

| Function | Permission |
|----------|-----------|
| `PriceFunction` | `dynamodb:PutItem` only |
| `HistoryFunction` | `dynamodb:Query` only |

`PriceFunction` also has `ses:SendEmail` scoped to verified SES identities in the account (`arn:aws:ses:region:account:identity/*`) — not a wildcard.

### API Gateway throttling

Enforced at the stage level across all endpoints:

- **Steady-state:** 10 requests/second
- **Burst cap:** 20 requests (token-bucket)

Clients exceeding the limit receive `HTTP 429` automatically.

### DynamoDB encryption at rest

The `CryptoSearchHistory` table has `SSEEnabled: true` with an AWS-managed KMS key. This is explicitly declared in the SAM template rather than relying on the silent default.

### Input validation

All query parameters are validated with Zod before reaching business logic. Invalid or missing parameters return a structured `400 ValidationError`. No raw error details or stack traces are exposed to the caller.

### No secrets in code

`EMAIL_FROM_ADDRESS` is a SAM parameter injected at deploy time via a GitHub Secret. AWS credentials are never stored in the repository.

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
| `email` | String | Email address (redundant with `userId`, kept for readability) |

Records are queried by `userId` and sorted by `searchedAt` descending (`ScanIndexForward: false`) — no additional index needed.

---

## Local Development

### Prerequisites

- Node.js 24 (`nvm use` reads `.nvmrc`)
- AWS CLI configured
- AWS SAM CLI
- Docker (for DynamoDB Local)
- DynamoDB Local running on port 8000

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

# Start both Lambdas via SAM (Terminal 1)
sam local start-api -t infra/template.yaml --env-vars env.local.json
```

`env.local.json` supplies `HISTORY_TABLE_NAME`, `DYNAMODB_ENDPOINT`, `AWS_REGION`, and `EMAIL_FROM_ADDRESS` to each function without touching the SAM template.

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

No AWS credentials or running services required.

### Test coverage (18 tests)

#### Validators — pure unit, zero mocks

| # | Test | Service |
|---|------|---------|
| 1 | Missing `coin` → `ValidationError` | price |
| 2 | Missing `email` → `ValidationError` | price |
| 3 | Invalid email format → `ValidationError` | price |
| 4 | Valid input → returns parsed data | price |
| 5 | Missing `email` → `ValidationError` | history |
| 6 | Invalid email format → `ValidationError` | history |
| 7 | Valid email → returns parsed data | history |

#### priceService — business logic, mocked dependencies

| # | Scenario | Assert |
|---|----------|--------|
| 8 | No recent search → email IS sent | `emailNotificationService.send` called |
| 9 | Recent search within 5 min → email skipped | `emailNotificationService.send` NOT called |
| 10 | `getCoinPrice` throws | error propagates; `saveSearchHistory` never called |
| 11 | `saveSearchHistory` throws | error propagates to handler |
| 12 | Dedup window wiring | `findRecentSearch` receives `since` ≈ `now − 5 min` |

Test #12 is the key invariant — it proves the dedup window is correctly wired, not just that the branch exists.

#### Handlers — HTTP contract, mocked service layer

| # | Scenario | Status |
|---|----------|--------|
| 13 | `queryStringParameters: null` | 400 (no crash) |
| 14 | `ValidationError` | 400 |
| 15 | `ExternalServiceError` | 502 |
| 16 | Success | 200 |
| 17 | Missing `email` | 400 |
| 18 | Empty history (new user) | 200 with `{ items: [], count: 0 }` |

### Intentionally deferred

| Layer | Reason |
|-------|--------|
| `historyRepository.js` | Requires DynamoDB Local — valuable integration test, out of scope for take-home |
| `coinGeckoClient.js` | Fetch mocking adds noise for low value at this stage |
| `sesClient.js` / `emailNotificationService.js` | Thin wrappers; covered indirectly via service tests |
| End-to-end | `sam local start-api` manual verification is sufficient |

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
    ├── sam build
    └── sam deploy
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

> **SES sandbox:** If your AWS account is in SES sandbox mode, both the sender and recipient email addresses must be verified in the SES console before emails will be delivered.

---

## Future Enhancements

### 1. SQS-based async email worker

Replace the in-Lambda SES call with an SQS publish. A dedicated `EmailWorkerLambda` processes the queue. Benefits: Lambda response time is unaffected even if SES is slow, retries are handled by SQS, and a Dead Letter Queue (DLQ) catches failed sends for later inspection. Only `priceService.js` changes — one line.

### 2. API Key authentication

The API is currently public, protected only by throttling. Adding API Gateway usage plans and API keys would allow:

- Per-consumer rate limits and quotas independent of the global throttle
- Auditing of per-key usage
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

### 4. Repository integration tests

The `historyRepository.js` layer is currently untested because it requires DynamoDB Local. Priority test cases when added:

- `findRecentSearch` returns `null` for a new user
- `findRecentSearch` returns a record for a recent same-coin search
- `saveSearchHistory` writes the correct attributes
- Results are returned newest-first

### 5. Observability

- Structured logs already use a consistent JSON format with `level`, `timestamp`, `message`, and `metadata` fields — ready to ship to CloudWatch Insights.
- Future: add CloudWatch alarms on Lambda error rate and P99 duration, an X-Ray trace per request, and a dashboard for the CoinGecko error rate and email send rate.

---

## Design Decisions

| Decision | Rationale |
|----------|-----------|
| CommonJS → ESM (`"type": "module"`) | Native Node.js 24 module format; no transpile step; enables top-level `await` |
| Zod for validation | Declarative schemas, typed output, first-class ESM support |
| Fire-and-forget email | SES latency should never add to the price API response time |
| DynamoDB dedup query instead of in-memory Map | Survives Lambda cold starts and scales across concurrent instances; in-memory state resets on cold start |
| Shared `package.json` for dev tooling | Single ESLint/Prettier/Husky config; no duplication across services |
| `sam validate --lint` in CI | Catches CloudFormation errors before any AWS API call is made |
| `--resolve-s3` in SAM deploy | No manual S3 bucket management; SAM handles the artifact bucket lifecycle |
| `PAY_PER_REQUEST` DynamoDB billing | No capacity planning needed; scales to zero at rest |

---

## Author

Built as a serverless AWS engineering exercise by Sagar.
