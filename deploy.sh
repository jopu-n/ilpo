#!/bin/bash

# Ilpo Discord Bot Deployment Script for Hetzner VPS
set -e

echo "🚀 Starting Ilpo Discord Bot deployment..."

# Configuration
APP_NAME="ilpo-discord-bot"
DEPLOY_DIR="/opt/ilpo-bot"
BACKUP_DIR="/opt/backups/ilpo-bot"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_status() {
  echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
  echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root or with sudo
if [[ $EUID -eq 0 ]]; then
  print_warning "Running as root. Consider using a non-root user with sudo privileges."
fi

# Check if Docker is installed
if ! command -v docker &>/dev/null; then
  print_error "Docker is not installed. Please install Docker first."
  echo "Run: curl -fsSL https://get.docker.com -o get-docker.sh && sh get-docker.sh"
  exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &>/dev/null; then
  print_error "Docker Compose is not installed. Please install Docker Compose first."
  echo "Run: sudo curl -L \"https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-\$(uname -s)-\$(uname -m)\" -o /usr/local/bin/docker-compose"
  echo "Then: sudo chmod +x /usr/local/bin/docker-compose"
  exit 1
fi

# Create deployment directory
print_status "Creating deployment directory..."
sudo mkdir -p "$DEPLOY_DIR"
sudo mkdir -p "$BACKUP_DIR"
sudo mkdir -p "$DEPLOY_DIR/logs"

# Copy application files
print_status "Copying application files..."
sudo cp -r . "$DEPLOY_DIR/"

# Set proper permissions
sudo chown -R $USER:$USER "$DEPLOY_DIR"
chmod +x "$DEPLOY_DIR/deploy.sh"

# Navigate to deployment directory
cd "$DEPLOY_DIR"

# Check if .env file exists
if [ ! -f .env ]; then
  print_warning ".env file not found. Creating from template..."
  cp .env.example .env
  print_error "Please edit .env file with your actual credentials:"
  echo "sudo nano $DEPLOY_DIR/.env"
  echo "Then run this script again."
  exit 1
fi

# Backup existing container if running
if docker ps -a | grep -q "$APP_NAME"; then
  print_status "Backing up existing container..."
  docker stop "$APP_NAME" || true
  docker rename "$APP_NAME" "${APP_NAME}-backup-$(date +%Y%m%d-%H%M%S)" || true
fi

# Build and start the container
print_status "Building and starting the bot container..."
docker-compose up --build -d

# Wait for container to be ready
print_status "Waiting for container to be ready..."
sleep 10

# Check if container is running
if docker ps | grep -q "$APP_NAME"; then
  print_status "✅ Ilpo Discord Bot deployed successfully!"
  echo ""
  echo "Container status:"
  docker ps | grep "$APP_NAME"
  echo ""
  echo "To view logs: docker logs -f $APP_NAME"
  echo "To stop: docker-compose down"
  echo "To restart: docker-compose restart"
else
  print_error "❌ Deployment failed. Check logs:"
  docker logs "$APP_NAME" || true
  exit 1
fi

# Set up systemd service for auto-restart on boot
print_status "Setting up systemd service..."
sudo tee /etc/systemd/system/ilpo-bot.service >/dev/null <<EOF
[Unit]
Description=Ilpo Discord Bot
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=$DEPLOY_DIR
ExecStart=/usr/local/bin/docker-compose up -d
ExecStop=/usr/local/bin/docker-compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable ilpo-bot.service

print_status "🎉 Deployment complete!"
echo ""
echo "Useful commands:"
echo "• View logs: docker logs -f $APP_NAME"
echo "• Restart bot: sudo systemctl restart ilpo-bot"
echo "• Stop bot: sudo systemctl stop ilpo-bot"
echo "• Update bot: cd $DEPLOY_DIR && git pull && docker-compose up --build -d"
echo ""
echo "Bot will automatically start on server reboot."
