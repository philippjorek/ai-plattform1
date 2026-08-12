// CORS handling for the /api/formular, /api/chat and /api/chat-feedback
// endpoints. Restricts which origins can read responses from these
// endpoints — this is NOT CSRF protection: it does not by itself stop a
// cross-origin request from being processed server-side, only from having
// its response read by cross-origin JS. See server/cors.mjs for the
// logic-identical twin used by the standalone production servers, which
// can't import this TS file directly.

export const ALLOWED_ORIGIN =
  process.env.ALLOWED_ORIGIN || "https://deploy.service-mit-herz.de";

export function applyCorsHeaders(res: import("node:http").ServerResponse) {
  res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
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
