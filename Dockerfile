# ── Build Stage ──────────────────────────────────────────────
FROM node:20-alpine AS base

WORKDIR /app

# Install dependencies first (layer caching)
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy source
COPY . .

# Ensure uploads dir exists
RUN mkdir -p server/uploads

# ── Production Stage ──────────────────────────────────────────
FROM node:20-alpine AS production

RUN apk add --no-cache curl

WORKDIR /app

# Copy from base
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app .

# Non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S securechat -u 1001 && \
    chown -R securechat:nodejs /app

USER securechat

EXPOSE 3000

ENV NODE_ENV=production

CMD ["node", "server/index.js"]
