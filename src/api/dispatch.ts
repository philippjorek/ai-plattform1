import { applyCorsHeaders, handlePreflight } from "../lib/cors.ts";
import { checkRateLimit, getClientIp } from "../lib/rate-limit.ts";
import { readBoundedBody } from "./body.ts";
import { sendJson } from "./json.ts";
import type { ApiRoute } from "./route.ts";

// Framework-agnostic connect-style middleware that serves a table of
// ApiRoutes. Vite wiring lives in vite-plugin.ts; keeping the dispatch here
// means it can be exercised without booting a dev server.
export function createApiMiddleware(routes: ApiRoute[]) {
  return async (
    req: import("node:http").IncomingMessage,
    res: import("node:http").ServerResponse,
    next: (err?: unknown) => void,
  ): Promise<void> => {
    if (handlePreflight(req, res)) return;

    const path = req.url?.split("?")[0];
    const route = routes.find(
      (candidate) => candidate.path === path && candidate.method === req.method,
    );
    if (!route) return next();

    applyCorsHeaders(res);

    const blocked = route.precondition?.(req);
    if (blocked) return sendJson(res, blocked);

    const { limited, retryAfterSeconds } = checkRateLimit(
      route.name,
      getClientIp(req),
      route.rateLimit,
    );
    if (limited) {
      return sendJson(res, {
        status: 429,
        body: { ok: false, error: "too many requests" },
        headers: { "retry-after": String(retryAfterSeconds) },
      });
    }

    try {
      const body =
        route.maxBodyBytes === undefined
          ? undefined
          : JSON.parse(await readBoundedBody(req, route.maxBodyBytes));
      sendJson(res, await route.handle({ body, req }));
    } catch (err) {
      sendJson(res, route.onError(err));
    }
  };
}
