# Use Node.js 18 LTS (use full image instead of alpine)
FROM node:20

# Install system dependencies for audio processing
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    ffmpeg \
    libc6-dev \
    && rm -rf /var/lib/apt/lists/*

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
RUN groupadd -r nodejs && useradd -r -g nodejs ilpo

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