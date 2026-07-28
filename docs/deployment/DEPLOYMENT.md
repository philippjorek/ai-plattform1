# Deployment

How this app runs in production: one Docker container on the Ubuntu server,
built and restarted by `.github/workflows/deploy.yml` on every push to `main`.

## How it works

1. `Dockerfile` builds a small image containing only `docker-entrypoint.sh`,
   Node 22, and git. It does **not** contain the app's source code.
2. When the container starts, `docker-entrypoint.sh`:
   - clones (or `git pull`s) `philippjorek/ai-plattform1` at `main` into
     `/app/checkout`
   - symlinks `/data` (a named volume, see below) in as the checkout's `data/`
     folder, so form submissions and chat feedback survive redeploys
   - copies in `.env` from a mounted secret file, if present
   - runs `npm ci` and `npm run build`
   - starts all three production processes: the web server (`vite preview`,
     port 8082), `server/formular-server.mjs` (port 8090), and
     `server/chat-server.mjs` (port 8091)
   - if any one of those three processes dies, the container exits so
     Docker's restart policy recreates it — which also re-pulls `main`
3. `deploy.yml`'s `deploy` job runs `docker build` + `docker run` on a
   **self-hosted GitHub Actions runner installed on the server itself** —
   that's the only step that needs to happen on the server, so no SSH keys or
   registry credentials have to leave GitHub.

Because the entrypoint pulls fresh code on every start, a plain
`docker restart service-mit-herz-web` (no rebuild) is enough to pick up new
commits — rebuilding the image is only needed when `Dockerfile` or
`docker-entrypoint.sh` itself changes.

## One-time server setup

Run these once on the Ubuntu server that will run the container.

### 1. Install Docker

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker "$USER"
# log out/in (or `newgrp docker`) for the group change to take effect
```

### 2. Install a self-hosted GitHub Actions runner

In the repo on GitHub: **Settings → Actions → Runners → New self-hosted
runner**, then follow the generated commands, e.g.:

```bash
mkdir -p /srv/actions-runner && cd /srv/actions-runner
curl -o actions-runner.tar.gz -L <url from GitHub's instructions>
tar xzf actions-runner.tar.gz
./config.sh --url https://github.com/philippjorek/ai-plattform1 --token <token from GitHub>
sudo ./svc.sh install
sudo ./svc.sh start
```

The runner user needs to be in the `docker` group (step 1) so it can run
`docker build`/`docker run` without `sudo`.

Verify it shows up as **Idle** under Settings → Actions → Runners before
continuing.

### 3. Create the secrets file

The app needs `OPEN_WEBUI_URL`, `OPEN_WEBUI_API_KEY`, `OPEN_WEBUI_MODEL` (see
`server/chat-server.mjs`). These must never be committed to git or baked into
the image — they're mounted into the container read-only at deploy time:

```bash
sudo mkdir -p /srv/service-mit-herz
sudo tee /srv/service-mit-herz/app.env > /dev/null <<'EOF'
OPEN_WEBUI_URL=...
OPEN_WEBUI_API_KEY=...
OPEN_WEBUI_MODEL=...
EOF
sudo chmod 600 /srv/service-mit-herz/app.env
```

This path matches the `-v /srv/service-mit-herz/app.env:/run/secrets/app.env:ro`
mount in `deploy.yml`. If you change the path on the server, update it there
too.

### 4. Reverse proxy (if the domain should point at this app)

The container publishes three ports on the host: `8082` (web), `8090`
(formular API), `8091` (chat API). Whatever already terminates TLS/handles
the domain on this server (e.g. an nginx running on the host, outside this
container) needs to route:

- `/` → `http://127.0.0.1:8082`
- `/api/formular` → `http://127.0.0.1:8090`
- `/api/chat`, `/api/chat-feedback` → `http://127.0.0.1:8091`

That reverse proxy config lives outside this repo and isn't managed by this
pipeline.

## Deploying

Push to `main`. GitHub Actions runs `test` → `build` (both on GitHub-hosted
runners, pure CI validation) → `deploy` (on the self-hosted runner, which
actually builds the image and recreates the container). If the `production`
environment has a required reviewer configured in repo settings, the `deploy`
job pauses for approval first.

## Manual operations on the server

```bash
# Tail logs
docker logs -f service-mit-herz-web

# Pick up new commits without waiting for CI (rebuild not needed unless
# Dockerfile/docker-entrypoint.sh changed)
docker restart service-mit-herz-web

# Full rebuild + recreate, same as the deploy job
cd /path/to/checked-out/repo && git pull
docker build -t service-mit-herz:latest .
docker rm -f service-mit-herz-web
docker run -d --name service-mit-herz-web --restart unless-stopped \
  -p 8082:8082 -p 8090:8090 -p 8091:8091 \
  -v service-mit-herz-data:/data \
  -v /srv/service-mit-herz/app.env:/run/secrets/app.env:ro \
  service-mit-herz:latest

# Inspect persisted form/chat data
docker run --rm -v service-mit-herz-data:/data alpine ls -la /data
```

## Known tradeoffs

- **Slower container starts**: `npm ci` + `npm run build` run fresh on every
  container start (usually 1–2 min), since the image itself doesn't bundle
  the app. Acceptable for a single-server, low-traffic deployment; would need
  revisiting (e.g. baking the build into the image at `docker build` time
  instead) if restarts become frequent or startup latency matters.
- **No separate staging environment**: `deploy.yml` deploys straight to the
  one production container. If a second environment is needed later, run a
  second container (different name/ports) from the same image.
