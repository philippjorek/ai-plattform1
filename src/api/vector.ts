import { isVectorConfigured, listAllVectors } from "../lib/vector-store.ts";
import type { JsonResponse } from "./json.ts";
import type { ApiRoute } from "./route.ts";

export const VECTOR_NOT_CONFIGURED: JsonResponse = {
  status: 503,
  body: { ok: false, error: "vector backend not configured" },
};

// Lists every record in the "Vectoraiplattform" Upstash Vector index for the
// /test inspector page.
export const vectorRoute: ApiRoute = {
  name: "vector-list",
  path: "/api/vector/all",
  method: "GET",
  rateLimit: { windowMs: 5 * 60 * 1000, max: 30 },
  precondition: () => (isVectorConfigured() ? null : VECTOR_NOT_CONFIGURED),
  handle: async () => {
    const listing = await listAllVectors();
    if (!listing) return VECTOR_NOT_CONFIGURED;
    return { status: 200, body: { ok: true, ...listing } };
  },
  onError: () => ({
    status: 502,
    body: { ok: false, error: "vector request failed" },
  }),
};
