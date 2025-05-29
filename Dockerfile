# Use Node.js 18 LTS as base image
FROM node:18-alpine

# Install system dependencies for audio processing
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    ffmpeg \
    libc6-compat

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Create resources directory if it doesn't exist
RUN mkdir -p resources

# Build TypeScript
RUN npm run build

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S ilpo -u 1001

# Change ownership of app directory
RUN chown -R ilpo:nodejs /app
USER ilpo

# Expose port (optional, mainly for health checks)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "console.log('Bot is running')" || exit 1

# Start the bot
CMD ["npm", "start"]