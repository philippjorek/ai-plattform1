# Deployment

How this app runs in production: code is updated **inside an already-running
Docker container** named `aiplattform2deploy` on the Ubuntu server, by
`.github/workflows/deploy.yml` on every push to `main`. This pipeline does
**not** build a Docker image or create/destroy the container — it only
updates the code inside it and restarts it. The container's startup command
is this repo's `docker-entrypoint.sh` (see `Dockerfile`), which runs three
processes on internal ports **8082** (web, `vite preview`), **8090**
(formular API, `server/formular-server.mjs`), and **8091** (chat API,
`server/chat-server.mjs`). After deployment the app is reachable at
**`deploy.service-mit-herz.de`**.

## How it works

1. `deploy.yml`'s `deploy` job runs on a **self-hosted GitHub Actions runner
   installed on the server itself** — that's the only step that needs to
   happen on the server, so no SSH keys or registry credentials have to leave
   GitHub.
2. That job runs, via `docker exec` into `aiplattform2deploy`:
   - `git -C /home/www/20260709/ai-plattform2 pull`
   - `npm --prefix /home/www/20260709/ai-plattform2 ci`
   - `npm --prefix /home/www/20260709/ai-plattform2 run build`
3. It then runs `docker restart aiplattform2deploy`, so `docker-entrypoint.sh`
   re-runs on container start, re-pulling/rebuilding the app and relaunching
   the three processes with the freshly built code on ports 8082, 8090, and
   8091.

The container itself — its existence, image, port mapping, and startup
command — is **not** managed by this pipeline. It must already be running
before the `deploy` job can succeed.

## One-time server setup

Run these once on the Ubuntu server that hosts `aiplattform2deploy`.

### 1. Install Docker (if not already present)

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
./config.sh --url https://github.com/<org>/<repo> --token <token from GitHub>
sudo ./svc.sh install
sudo ./svc.sh start
```

The runner user needs to be in the `docker` group (step 1) so it can run
`docker exec`/`docker restart` against `aiplattform2deploy` without `sudo`.

Verify it shows up as **Idle** under Settings → Actions → Runners before
continuing.

### 3. Ensure `aiplattform2deploy` exists and is set up correctly

This container is **not created by the pipeline** — it must already exist
and be running. It needs:

- **Node.js + npm + git installed inside the container** (the pipeline runs
  `git pull` / `npm ci` / `npm run build` inside it via `docker exec`).
- **A working git checkout at `/home/www/20260709/ai-plattform2` inside the
  container**, on branch `main`, with a remote already configured that can
  be pulled from **non-interactively** (no credential prompts) — set up a
  deploy key or stored credential helper for whichever remote (GitLab or
  GitHub) hosts this repo.
- **Ports 8082, 8090, and 8091 published from the container to the host**
  (matching the `Dockerfile`'s `EXPOSE`) — e.g. `-p 8082:8082 -p 8090:8090
  -p 8091:8091` on `docker create`/`docker run`.
- **A startup command (entrypoint/CMD) that is `docker-entrypoint.sh`** (or
  functionally equivalent to it) and is re-invoked automatically whenever the
  container restarts — this is what makes `docker restart aiplattform2deploy`
  pick up the new build and relaunch all three processes (web on 8082,
  formular API on 8090, chat API on 8091).

If any of the above isn't true yet, fix it directly on the container/its
image — this file only documents what the pipeline assumes, it doesn't
create it.

### 4. Reverse proxy

After deployment the site is reachable at **`deploy.service-mit-herz.de`**.
Whatever already terminates TLS/handles that subdomain on this server (e.g.
an nginx running on the host, outside this container) needs to route, based
on path, to the three ports published in step 3:

- `deploy.service-mit-herz.de/` (everything else) → `http://127.0.0.1:8082`
- `deploy.service-mit-herz.de/api/formular` → `http://127.0.0.1:8090`
- `deploy.service-mit-herz.de/api/chat` and `/api/chat-feedback` →
  `http://127.0.0.1:8091`

That reverse proxy config (including the DNS record for the subdomain and
its TLS cert) lives outside this repo and isn't managed by this pipeline.

## Deploying

Push to `main`. GitHub Actions runs `test` → `build` (both on GitHub-hosted
runners, pure CI validation — they check out a fresh copy and build it, but
don't touch the server) → `deploy` (on the self-hosted runner, which updates
and restarts `aiplattform2deploy`). If the `production` environment has a
required reviewer configured in repo settings, the `deploy` job pauses for
approval first.

### If a step fails

`deploy.yml` defines no explicit failure handling (no `continue-on-error`,
no retry, no rollback step) on the `test`, `build`, or `deploy` jobs — it
relies entirely on GitHub Actions' default `needs:` behavior:

- **`test` fails** (`npm test` exits non-zero): the `test` job is marked
  failed. `build` (`needs: test`) and `deploy` (`needs: build`) are both
  **skipped** — they never run. `aiplattform2deploy` is never touched, so
  it keeps serving whatever it was already running before the push.
- **`build` fails** (`npm run build` exits non-zero, after `test` passed):
  same effect — `deploy` (`needs: build`) is **skipped**, production is
  untouched.
- **`deploy` fails partway through** (e.g. `git pull` or `npm ci` fails
  inside the container): the job stops at that step; later steps
  (`npm run build`, `docker restart`) don't run. The container keeps
  running on its **previous** build — `docker restart` is the last step,
  so a failure before it never applies the new code. There is no automatic
  rollback of the git checkout inside the container; a failed `npm ci`/
  `npm run build` there can leave `node_modules`/`dist` in a partially
  updated state until the next successful deploy run overwrites it.

In short: a failure at any stage blocks the pipeline from reaching
`docker restart`, so the live container is never left serving a broken
build — but nothing notifies anyone beyond the GitHub Actions run showing
red, and nothing retries automatically.

## Manual operations on the server

```bash
# Tail logs
docker logs -f aiplattform2deploy

# Manually repeat what the deploy job does
docker exec aiplattform2deploy git -C /home/www/20260709/ai-plattform2 pull
docker exec aiplattform2deploy npm --prefix /home/www/20260709/ai-plattform2 ci
docker exec aiplattform2deploy npm --prefix /home/www/20260709/ai-plattform2 run build
docker restart aiplattform2deploy

# Shell into the container to inspect the checkout directly
docker exec -it aiplattform2deploy bash
```

## Known tradeoffs

- **Shared, pre-provisioned container**: unlike a fully disposable
  build-and-recreate flow, `aiplattform2deploy` is long-lived and manually
  provisioned — if its git remote, Node version, or startup command drift
  from what this file describes, the deploy job will fail or silently serve
  stale code. Keep this doc in sync if that setup changes.
- **No separate staging environment**: `deploy.yml` deploys straight to the
  one production container.
