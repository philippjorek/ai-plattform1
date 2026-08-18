import { fetchVector, isVectorConfigured } from "../lib/vector-store.ts";
import type { ApiRoute } from "./route.ts";
import { VECTOR_NOT_CONFIGURED } from "./vector.ts";

function readId(req: import("node:http").IncomingMessage): string | null {
  return new URL(req.url ?? "", "http://localhost").searchParams.get("id");
}

// Single-record lookup in the "Vectoraiplattform" index.
export const vectorFetchRoute: ApiRoute = {
  name: "vector",
  path: "/api/vector",
  method: "GET",
  rateLimit: { windowMs: 5 * 60 * 1000, max: 30 },
  // Both checks run before the rate limit, so a misconfigured backend or a
  // malformed request doesn't spend the caller's budget.
  precondition: (req) => {
    if (!isVectorConfigured()) return VECTOR_NOT_CONFIGURED;
    if (!readId(req)) {
      return { status: 400, body: { ok: false, error: "missing id" } };
    }
    return null;
  },
  handle: async ({ req }) => {
    const found = await fetchVector(readId(req) ?? "");
    if (!found) return VECTOR_NOT_CONFIGURED;
    return { status: 200, body: { ok: true, result: found.record } };
  },
  onError: () => ({
    status: 502,
    body: { ok: false, error: "vector request failed" },
  }),
};
