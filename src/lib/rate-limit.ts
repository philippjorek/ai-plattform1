// In-memory per-IP sliding-window rate limiter for the API endpoints. No
// external dependency (Redis etc.) since this is a small single-instance
// site. Counters live per process, so the Vite dev server and each
// standalone server in server/ limit independently.

export type RateLimitOptions = { windowMs: number; max: number };
export type RateLimitResult = { limited: boolean; retryAfterSeconds?: number };

const hitsByKey = new Map<string, number[]>();

// Sweep horizon: how long a key's hits are kept around before being swept,
// independent of any single call's windowMs, so the Map doesn't grow
// unbounded across many distinct IPs over the life of a long-running
// dev/preview/production process.
const MAX_TRACKED_WINDOW_MS = 10 * 60 * 1000;

export function checkRateLimit(
  scope: string,
  ip: string,
  { windowMs, max }: RateLimitOptions,
): RateLimitResult {
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

export function getClientIp(req: import("node:http").IncomingMessage): string {
  const xff = req.headers["x-forwarded-for"];
  const first = Array.isArray(xff) ? xff[0] : xff;
  if (first) return first.split(",")[0].trim();
  return req.socket?.remoteAddress ?? "unknown";
}

const sweepInterval = setInterval(
  () => {
    const now = Date.now();
    for (const [key, hits] of hitsByKey) {
      const fresh = hits.filter((t) => now - t < MAX_TRACKED_WINDOW_MS);
      if (fresh.length === 0) hitsByKey.delete(key);
      else hitsByKey.set(key, fresh);
    }
  },
  10 * 60 * 1000,
);
sweepInterval.unref();
