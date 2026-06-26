# nimo-test

Build a production-quality AWS serverless solution using Node.js that prioritizes readability, maintainability, resilience, and simplicity over unnecessary complexity.


## Project Structure

```
nimo-test/
├── crypto-price-service/   # Port 3001 — fetches live crypto prices, tracks search history
└── search-history-service/ # Port 3002 — reads search history from service 1
```

## Services

### crypto-price-service (port 3001)
- `GET /price/:coinId` — queries CoinGecko free API for live USD price; records each search in memory
- `GET /history` — returns all past searches as `[{ coinId, price, timestamp }]`
- Uses Express + Axios; history is in-memory (resets on restart)

### search-history-service (port 3002)
- `GET /history` — proxies the history endpoint from crypto-price-service
- Depends on crypto-price-service being up at `http://localhost:3001`


## General Principles

* Write code as if it will be maintained by another senior engineer.
* Prefer simple, readable solutions over clever or overly abstract implementations.
* Follow clean architecture and separation of concerns.
* Avoid premature optimization or unnecessary design patterns.
* AWS best practices

## Project Structure

* Keep Lambda handlers thin. Handlers should only:

* parse and validate requests
* invoke application services
* map results to HTTP responses
* Business logic belongs in service modules.
* External integrations (CoinGecko, SES, DynamoDB) must be encapsulated behind client or repository classes.
* Shared utilities should remain generic and reusable.

## Code Style

* Use modern JavaScript (Node.js 24 LTS).
* Prefer async/await over Promise chains.
* Use const by default; use let only when reassignment is required.
* Avoid var.
* Prefer early returns over nested conditionals.
* Functions should have a single responsibility and generally remain under 40–50 lines(if possible).
* Keep files focused and reasonably small.

## Validation

* Validate all incoming API requests.
* Validate environment variables during application startup.
* Never trust responses from external APIs.
* Return meaningful validation errors.

## Error Handling

* Handle every asynchronous operation appropriately.
* Create domain-specific error classes instead of throwing generic Error objects where appropriate.
* Return consistent HTTP error responses.
* Never swallow exceptions silently.

## Logging

* Use structured logging.
* Include contextual information useful for debugging.
* Never log secrets, credentials, or sensitive customer data.

## AWS Best Practices

* Design Lambda functions to be stateless.
* Design operations to be idempotent where practical.
* Use least-privilege IAM permissions.
* Avoid unnecessary AWS services or complexity.
* Keep infrastructure modular and maintainable.


## Testing

* Write unit tests for business logic.
* Mock external services during testing.
* Keep business logic testable without requiring AWS resources.

## Dependencies

* Minimize dependencies.
* Remove unused packages.
* Prefer native Node.js functionality when appropriate.

## Documentation

* Document architectural decisions and assumptions in the README.
* Explain trade-offs when choosing one design over another.
* Keep public APIs documented.

## Git

* Use Conventional Commits.
* Keep commits focused on a single logical change.
* Ensure linting and tests pass before committing.
* Make sure commit message has a menaningful information

## Decision Making

When multiple valid implementations exist:

1. Prefer simplicity.
2. Prefer maintainability.
3. Prefer readability.
4. Prefer AWS serverless best practices.
5. Explain significant architectural trade-offs before implementing them.

## Running Locally

```bash
# Service 1
cd crypto-price-service && npm install && npm start

# Service 2 (in a separate terminal)
cd search-history-service && npm install && npm start
```

Dev mode (auto-restart on file change, Node 18+):
```bash
npm run dev
```

## Linting & Formatting

Each service has its own ESLint v9 (flat config) + Prettier v3 setup.

```bash
npm run lint        # check for lint errors
npm run lint:fix    # auto-fix lint errors
npm run format      # format with Prettier
```

## Tech Stack

- **Runtime**: Node.js (CommonJS)
- **Framework**: Express v4
- **HTTP client**: Axios
- **Crypto API**: CoinGecko v3 (free, no API key required)
- **Linter**: ESLint v9 with `@eslint/js` + `eslint-config-prettier`
- **Formatter**: Prettier v3

## Conventions

- CommonJS (`require`/`module.exports`) throughout — no `"type": "module"`
- Each microservice is fully self-contained with its own `package.json` and tooling config
- No shared database — service 2 consumes service 1's HTTP API