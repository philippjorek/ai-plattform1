# Pinned >= 22.18: the standalone API servers in server/*.mjs import their
# route definitions from src/api/*.ts and rely on Node running TypeScript
# directly (type stripping is on by default from 22.18).
FROM node:22.23-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends git ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

ENV REPO_URL=https://github.com/philippjorek/ai-plattform1.git \
    REPO_BRANCH=main \
    APP_DIR=/app/checkout

EXPOSE 8082 8090 8091 8092

ENTRYPOINT ["docker-entrypoint.sh"]
