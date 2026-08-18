import { createServer } from "node:http";
import { applyCorsHeaders } from "../lib/cors.ts";
import { createApiMiddleware } from "./dispatch.ts";
import { sendJson } from "./json.ts";
import type { ApiRoute } from "./route.ts";

// Serves a subset of the API route table as a standalone Node HTTP server —
// the production counterpart to devApiPlugin, sharing the same routes and
// dispatch. Nothing else can serve an unmatched request here (unlike the Vite
// middleware chain), so falling through means 404.
export function createApiServer(routes: ApiRoute[]) {
  const middleware = createApiMiddleware(routes);

  return createServer((req, res) => {
    void middleware(req, res, () => {
      applyCorsHeaders(res);
      sendJson(res, { status: 404, body: { ok: false } });
    });
  });
}

export function startApiServer(
  name: string,
  routes: ApiRoute[],
  defaultPort: number,
) {
  const port = Number(process.env.PORT) || defaultPort;
  createApiServer(routes).listen(port, () => {
    console.log(`${name} listening on http://0.0.0.0:${port}`);
  });
}
