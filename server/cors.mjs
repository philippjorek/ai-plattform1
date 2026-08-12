// Logic-identical twin of src/lib/cors.ts for the standalone production
// servers (server/formular-server.mjs, server/chat-server.mjs), which run
// under plain Node with no build step and so can't import the TS version.

export const ALLOWED_ORIGIN =
  process.env.ALLOWED_ORIGIN || "https://deploy.service-mit-herz.de";

export function applyCorsHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
  res.setHeader("Vary", "Origin");
}

// Returns true if it fully handled (and ended) an OPTIONS preflight.
export function handlePreflight(req, res) {
  if (req.method !== "OPTIONS") return false;
  applyCorsHeaders(res);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "content-type");
  res.setHeader("Access-Control-Max-Age", "600");
  res.statusCode = 204;
  res.end();
  return true;
}
