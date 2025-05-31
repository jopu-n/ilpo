# Use Node.js 20 LTS (use full image instead of alpine)
FROM node:20

# Install system dependencies for audio processing
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    ffmpeg \
    libc6-dev \
    libopus-dev \
    libsodium-dev \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies with more verbose output
RUN npm ci --only=production --verbose

# Copy source code
COPY . .

# Create resources directory if it doesn't exist
RUN mkdir -p resources

# Build TypeScript
RUN npm run build

# Test ffmpeg installation
RUN ffmpeg -version

# Create non-root user for security
RUN groupadd -r nodejs && useradd -r -g nodejs ilpo

# Change ownership of app directory
RUN chown -R ilpo:nodejs /app
USER ilpo

# Expose port (optional, mainly for health checks)
EXPOSE 3000

# Health check with more detailed output
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "console.log('Bot health check:', Date.now())" || exit 1

# Start the bot with more verbose logging
CMD ["node", "dist/index.js"]