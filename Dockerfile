# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build application
RUN npm run build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 syncsphere

# Copy package manifests and install production dependencies only
COPY package*.json ./
RUN npm ci --only=production

# Copy built application assets
COPY --from=builder /app/dist ./dist

# Set ownership
RUN chown -R syncsphere:nodejs /app

USER syncsphere

EXPOSE 3000

CMD ["node", "dist/server.cjs"]
