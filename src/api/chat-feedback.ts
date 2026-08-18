import { saveChatFeedback } from "../lib/chat-feedback-store.ts";
import { bodyErrorStatus } from "./body.ts";
import type { ApiRoute } from "./route.ts";

// Logs thumbs-up/down feedback on chat replies to data/chat-feedback.json.
export const chatFeedbackRoute: ApiRoute = {
  name: "chat-feedback",
  path: "/api/chat-feedback",
  method: "POST",
  rateLimit: { windowMs: 10 * 60 * 1000, max: 30 },
  maxBodyBytes: 20 * 1024,
  handle: async ({ body }) => {
    await saveChatFeedback(body);
    return { status: 200, body: { ok: true } };
  },
  onError: (err) => ({ status: bodyErrorStatus(err), body: { ok: false } }),
};
