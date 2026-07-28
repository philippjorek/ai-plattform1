FROM node:22-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends git ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

ENV REPO_URL=https://github.com/philippjorek/ai-plattform1.git \
    REPO_BRANCH=main \
    APP_DIR=/app/checkout

EXPOSE 8082 8090 8091

ENTRYPOINT ["docker-entrypoint.sh"]
