# ==============================
# Stage 1: Install Dependencies
# ==============================
FROM node:22-alpine AS deps

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# ==============================
# Stage 2: Production
# ==============================
FROM node:22-alpine AS production

# Add labels for better image management
LABEL maintainer="Shubham Gayke"
LABEL app="linguistai-server"
LABEL version="1.0.0"

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup

# Copy production dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy application source
COPY --chown=appuser:appgroup . .

# Remove unnecessary files
RUN rm -rf \
    .env \
    .env.* \
    *.test.js \
    __tests__ \
    coverage \
    .git \
    .dockerignore \
    Dockerfile* \
    docker-compose* \
    README.md \
    error_log.txt \
    users_dump.txt \
    models_list.txt

# Expose backend port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:5000/health || exit 1

# Run as non-root user
USER appuser

# Start the server
CMD ["node", "src/index.js"]
