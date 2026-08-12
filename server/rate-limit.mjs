// Logic-identical twin of src/lib/rate-limit.ts for the standalone
// production servers (server/formular-server.mjs, server/chat-server.mjs),
// which run under plain Node with no build step and so can't import the TS
// version.

const hitsByKey = new Map();

const MAX_TRACKED_WINDOW_MS = 10 * 60 * 1000;

export function checkRateLimit(scope, ip, { windowMs, max }) {
  const key = `${scope}:${ip}`;
  const now = Date.now();
  const hits = (hitsByKey.get(key) ?? []).filter((t) => now - t < windowMs);

  if (hits.length >= max) {
    hitsByKey.set(key, hits);
    return {
      limited: true,
      retryAfterSeconds: Math.ceil((windowMs - (now - hits[0])) / 1000),
    };
  }

  hits.push(now);
  hitsByKey.set(key, hits);
  return { limited: false };
}

export function getClientIp(req) {
  const xff = req.headers["x-forwarded-for"];
  const first = Array.isArray(xff) ? xff[0] : xff;
  if (first) return first.split(",")[0].trim();
  return req.socket?.remoteAddress ?? "unknown";
}

setInterval(
  () => {
    const now = Date.now();
    for (const [key, hits] of hitsByKey) {
      const fresh = hits.filter((t) => now - t < MAX_TRACKED_WINDOW_MS);
      if (fresh.length === 0) hitsByKey.delete(key);
      else hitsByKey.set(key, fresh);
    }
  },
  10 * 60 * 1000,
).unref();
