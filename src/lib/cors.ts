// CORS handling for the API endpoints. Restricts which origins can read
// responses from them — this is NOT CSRF protection: it does not by itself
// stop a cross-origin request from being processed server-side, only from
// having its response read by cross-origin JS. Used by both the Vite
// dev/preview plugin and the standalone servers in server/.

// Read on use, not at import time, so it doesn't matter whether the module
// graph is loaded before or after the .env files are.
export function allowedOrigin(): string {
  return process.env.ALLOWED_ORIGIN || "https://deploy.service-mit-herz.de";
}

export function applyCorsHeaders(res: import("node:http").ServerResponse) {
  res.setHeader("Access-Control-Allow-Origin", allowedOrigin());
  res.setHeader("Vary", "Origin");
}

// Returns true if it fully handled (and ended) an OPTIONS preflight.
export function handlePreflight(
  req: import("node:http").IncomingMessage,
  res: import("node:http").ServerResponse,
): boolean {
  if (req.method !== "OPTIONS") return false;
  applyCorsHeaders(res);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "content-type");
  res.setHeader("Access-Control-Max-Age", "600");
  res.statusCode = 204;
  res.end();
  return true;
}
