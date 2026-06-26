FROM node:24-alpine

WORKDIR /app

# Copy shared utilities (required by this service via relative path)
COPY --chown=node:node shared/ ./shared/

# Install production dependencies
WORKDIR /app/search-history-service
COPY --chown=node:node search-history-service/package.json search-history-service/package-lock.json ./
RUN npm ci --omit=dev

# Copy source
COPY --chown=node:node search-history-service/src/ ./src/

USER node

EXPOSE 3002

CMD ["node", "src/index.js"]
