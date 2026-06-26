FROM node:24-alpine

WORKDIR /app

# Copy shared utilities (required by this service via relative path)
COPY --chown=node:node shared/ ./shared/

# Install production dependencies
WORKDIR /app/crypto-price-service
COPY --chown=node:node crypto-price-service/package.json crypto-price-service/package-lock.json ./
RUN npm ci --omit=dev

# Copy source
COPY --chown=node:node crypto-price-service/src/ ./src/

USER node

EXPOSE 3001

CMD ["node", "src/index.js"]
