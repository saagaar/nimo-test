# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Build a production-quality AWS serverless solution using Node.js that prioritizes readability, maintainability, resilience, and simplicity over unnecessary complexity.

---

## Project Structure

```
nimo-test/
├── crypto-price-service/   # Express service on port 3001 — live crypto prices + search history
├── search-history-service/ # Express service on port 3002 — reads history from service 1
├── shared/
│   ├── constants/          # Ports, API base URLs, inter-service URLs
│   └── utils/              # Generic reusable helpers
├── eslint.config.js        # Single ESLint config for all services (root-level)
├── .prettierrc             # Single Prettier config for all services (root-level)
├── commitlint.config.js    # Conventional Commits enforcement
└── package.json            # Dev tooling only (ESLint, Prettier, Husky, commitlint)
```

Each service has its own `package.json` for **production dependencies only** (`express`, `axios`). Dev tooling lives exclusively at the root.

Services import shared code via relative paths (e.g. `require('../../shared/constants')`).

---

## Developer Setup

```bash
# 1. Use correct Node version
nvm use                     # reads .nvmrc (v24.18.0)

# 2. Install dev tooling + wire git hooks
npm install                 # run from repo root

# 3. Install each service's production dependencies
cd crypto-price-service && npm install
cd search-history-service && npm install
```

---

## Commands

### Running services locally

```bash
# Terminal 1
cd crypto-price-service && npm start       # http://localhost:3001

# Terminal 2
cd search-history-service && npm start     # http://localhost:3002

# Dev mode (Node built-in watch, auto-restarts on change)
npm run dev
```

### Linting & formatting (run from repo root)

```bash
npm run lint            # lint both services
npm run lint:price      # lint crypto-price-service only
npm run lint:history    # lint search-history-service only
npm run lint:fix        # auto-fix across both services
npm run format          # Prettier across shared/ + both services
```

### Docker

```bash
docker compose up --build   # build and start both services
```

---

## Architecture

### Lambda handler pattern (target architecture)
Keep handlers thin. A handler should only:
- Parse and validate the incoming event
- Invoke a service module
- Map the result to an HTTP response

Business logic belongs in `src/services/`. External integrations (CoinGecko, DynamoDB, SES) must be encapsulated behind a dedicated client or repository class in `src/clients/` or `src/repositories/`.

### Inter-service communication
`search-history-service` calls `crypto-price-service` via HTTP. The base URL is read from `process.env.CRYPTO_PRICE_SERVICE_URL` (defaults to `http://localhost:3001` for local dev; set to the service name in Docker/ECS).

### Shared folder
`shared/constants/` holds ports, API base URLs, and inter-service URLs. `shared/utils/` holds generic helpers. Both are consumed via relative `require()` — no npm package, no build step.

---

## Code Style

- Node.js 24 LTS, CommonJS (`require`/`module.exports`) throughout — no `"type": "module"`
- `async`/`await` over Promise chains
- `const` by default; `let` only when reassignment is required; never `var`
- Early returns over nested conditionals
- Single responsibility per function; aim for under 40–50 lines per function
- Validate all incoming API requests and environment variables at startup
- Never trust external API responses — validate shape before using

---

## Error Handling & Logging

- Handle every async operation; never swallow exceptions silently
- Use domain-specific error classes over generic `Error` where appropriate
- Return consistent HTTP error shapes
- Use structured logging with contextual fields useful for debugging
- Never log secrets, credentials, or sensitive customer data

---

## AWS Best Practices

- Lambda functions must be stateless
- Design operations to be idempotent where practical
- Use least-privilege IAM permissions
- Avoid unnecessary AWS services or complexity
- Keep infrastructure modular and maintainable

---

## Git

- Conventional Commits enforced via commitlint on every commit
- Allowed types: `feat`, `fix`, `chore`, `docs`, `style`, `refactor`, `test`, `perf`, `ci`, `revert`
- Format: `type: short lowercase description` (max 100 chars)
- ESLint runs automatically on pre-commit via Husky — fix lint errors before committing

---

## Decision Making

When multiple valid implementations exist:
1. Prefer simplicity
2. Prefer maintainability
3. Prefer readability
4. Prefer AWS serverless best practices
5. Explain significant architectural trade-offs before implementing them
