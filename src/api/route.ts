import type { RateLimitOptions } from "../lib/rate-limit.ts";
import type { JsonResponse } from "./json.ts";

export type ApiHandlerInput = {
  // Parsed JSON body — undefined for routes declared without `maxBodyBytes`.
  body: unknown;
  req: import("node:http").IncomingMessage;
};

// One HTTP endpoint, described as data. Everything common to all of them
// (preflight, CORS, rate limiting, body reading, JSON writing) lives in
// dispatch.ts, so a route only states what is actually specific to it.
export type ApiRoute = {
  // Rate-limit scope; doubles as the route's name.
  name: string;
  path: string;
  method: "GET" | "POST";
  rateLimit: RateLimitOptions;
  // Max request-body size. Omit for routes that take no body.
  maxBodyBytes?: number;
  // Runs before the rate-limit check; a returned response short-circuits, so
  // a route that cannot serve at all does not consume the caller's budget.
  precondition?: (
    req: import("node:http").IncomingMessage,
  ) => JsonResponse | null;
  handle: (input: ApiHandlerInput) => Promise<JsonResponse>;
  // Maps a thrown error (oversized body, malformed JSON, handler failure)
  // to this route's error response.
  onError: (err: unknown) => JsonResponse;
};
