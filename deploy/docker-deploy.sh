#!/usr/bin/env bash
set -euo pipefail

APP_DIR=${APP_DIR:-/opt/telegram-min-webhook}
IMAGE=${IMAGE:-ghcr.io/chenmo0414/telegram-min-webhook:latest}

mkdir -p "$APP_DIR"
cd "$APP_DIR"

if [ ! -f .env ]; then
  echo "[ERROR] .env not found in $APP_DIR"
  echo "Create .env first (see project .env.example)"
  exit 1
fi

if [ ! -f docker-compose.yml ]; then
  cat > docker-compose.yml <<'YAML'
services:
  telegram-min-webhook:
    image: ghcr.io/chenmo0414/telegram-min-webhook:latest
    container_name: telegram-min-webhook
    restart: unless-stopped
    env_file:
      - .env
    ports:
      - "127.0.0.1:13000:3000"
YAML
fi

if command -v docker-compose >/dev/null 2>&1; then
  docker-compose pull
  docker-compose up -d
else
  docker compose pull
  docker compose up -d
fi

echo "[OK] deployed $IMAGE"
