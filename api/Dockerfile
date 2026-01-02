# syntax=docker/dockerfile:1

FROM node:20-slim AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Production image
FROM node:20-slim AS runner

WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm ci --omit=dev

# Copy built files
COPY --from=builder /app/dist ./dist

# Create data directory for SQLite (will be mounted as volume)
RUN mkdir -p /data

ENV NODE_ENV=production
ENV DATABASE_PATH=/data/telemetry.db
ENV PORT=3000

EXPOSE 3000

CMD ["node", "dist/index.js"]
