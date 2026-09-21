# Stage 1: Build
FROM node:20-slim AS builder
WORKDIR /app
COPY package*.json ./
# Konfigurasi retry untuk mencegah kegagalan akibat transient network error (ECONNRESET)
RUN npm config set fetch-retries 5 \
    && npm config set fetch-retry-mintimeout 20000 \
    && npm config set fetch-retry-maxtimeout 120000 \
    && (npm ci || (sleep 3 && npm ci) || (sleep 5 && npm ci))
COPY . .
RUN npm run build

# Stage 2: Production Runner
FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# Install curl untuk healthcheck container
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/.output ./.output
COPY --from=builder /app/package*.json ./
RUN npm config set fetch-retries 5 \
    && npm config set fetch-retry-mintimeout 20000 \
    && npm config set fetch-retry-maxtimeout 120000 \
    && (npm ci --omit=dev || (sleep 3 && npm ci --omit=dev) || (sleep 5 && npm ci --omit=dev))

EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]

