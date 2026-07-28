#!/usr/bin/env bash
# Runs once per container start. Pulls the latest app code straight from
# GitHub, builds it, and runs the three production processes (web, formular
# API, chat API). To deploy a new version: restart/recreate this container.
#
# See DEPLOYMENT.md for the full setup this expects on the host.
set -euo pipefail

: "${REPO_URL:?REPO_URL must be set}"
: "${REPO_BRANCH:=main}"
: "${APP_DIR:=/app/checkout}"

if [ -d "$APP_DIR/.git" ]; then
  echo "==> Pulling latest $REPO_BRANCH from $REPO_URL"
  git -C "$APP_DIR" fetch --depth 1 origin "$REPO_BRANCH"
  git -C "$APP_DIR" reset --hard "origin/$REPO_BRANCH"
else
  echo "==> Cloning $REPO_URL ($REPO_BRANCH)"
  git clone --branch "$REPO_BRANCH" --depth 1 "$REPO_URL" "$APP_DIR"
fi

# data/ holds runtime state (form submissions, chat feedback) written by the
# app itself. It must survive container recreation even though $APP_DIR is
# re-cloned from scratch each start, so it lives on a separate named volume
# mounted at /data and gets symlinked into the checkout.
mkdir -p /data
rm -rf "${APP_DIR:?}/data"
ln -s /data "$APP_DIR/data"

# Secrets (OPEN_WEBUI_* etc.) are never baked into the image or the git repo.
# They're mounted read-only from the host at /run/secrets/app.env.
if [ -f /run/secrets/app.env ]; then
  cp /run/secrets/app.env "$APP_DIR/.env"
fi

cd "$APP_DIR"

echo "==> Installing dependencies"
npm ci

echo "==> Building"
npm run build

echo "==> Starting formular-server.mjs (port 8090)"
node server/formular-server.mjs &
FORMULAR_PID=$!

echo "==> Starting chat-server.mjs (port 8091)"
node server/chat-server.mjs &
CHAT_PID=$!

echo "==> Starting web server (port 8082)"
npm run preview -- --host 0.0.0.0 --port 8082 &
WEB_PID=$!

cleanup() {
  kill "$FORMULAR_PID" "$CHAT_PID" "$WEB_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

# If any of the three processes dies, exit so Docker's restart policy
# recreates the container — which also picks up any newer commit on next start.
wait -n "$FORMULAR_PID" "$CHAT_PID" "$WEB_PID"
echo "!! One of the processes exited — shutting down container"
exit 1
