# Multi-stage build for production
FROM node:18-alpine AS base

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Dependencies stage
FROM base AS dependencies

# Install all dependencies (including dev dependencies)
RUN npm ci --only=production=false

# Production dependencies stage
FROM base AS production-dependencies

# Install only production dependencies
RUN npm ci --only=production && npm cache clean --force

# Build stage
FROM dependencies AS build

# Copy source code
COPY . .

# Run tests in build stage (optional, can be disabled for faster builds)
# RUN npm test

# Production stage
FROM base AS production

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy production dependencies
COPY --from=production-dependencies --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copy application code
COPY --chown=nodejs:nodejs . .

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node healthcheck.js

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["npm", "start"]