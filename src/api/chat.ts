import { getChatReply, readChatEnv } from "../lib/chat-client.ts";
import { bodyErrorStatus } from "./body.ts";
import type { JsonResponse } from "./json.ts";
import type { ApiRoute } from "./route.ts";

const NOT_CONFIGURED: JsonResponse = {
  status: 503,
  body: { ok: false, error: "chat backend not configured" },
};

// Proxies chat messages to Open WebUI.
export const chatRoute: ApiRoute = {
  name: "chat",
  path: "/api/chat",
  method: "POST",
  rateLimit: { windowMs: 5 * 60 * 1000, max: 20 },
  // 40 messages * 4000 chars max content each, plus JSON overhead.
  maxBodyBytes: 250 * 1024,
  // Checked as a precondition so an unconfigured backend answers 503 without
  // spending the caller's rate-limit budget.
  precondition: () => (readChatEnv() ? null : NOT_CONFIGURED),
  handle: async ({ body }) => {
    const env = readChatEnv();
    if (!env) return NOT_CONFIGURED;
    return {
      status: 200,
      body: { ok: true, reply: await getChatReply(body, env) },
    };
  },
  onError: (err) => ({
    status: bodyErrorStatus(err),
    body: { ok: false, error: "chat request failed" },
  }),
};
