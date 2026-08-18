import type { Plugin } from "vite";
import { createApiMiddleware } from "./dispatch.ts";
import type { ApiRoute } from "./route.ts";

// Serves the API route table under `vite dev` and `vite preview`.
export function devApiPlugin(routes: ApiRoute[]): Plugin {
  const middleware = createApiMiddleware(routes);

  return {
    name: "dev-api",
    configureServer(server) {
      server.middlewares.use(
        (req, res, next) => void middleware(req, res, next),
      );
    },
    configurePreviewServer(server) {
      server.middlewares.use(
        (req, res, next) => void middleware(req, res, next),
      );
    },
  };
}
