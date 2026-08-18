import { saveFormularSubmission } from "../lib/formular-store.ts";
import { bodyErrorStatus } from "./body.ts";
import type { ApiRoute } from "./route.ts";

// Persists Formular submissions to data/formular-submissions.json.
export const formularRoute: ApiRoute = {
  name: "formular",
  path: "/api/formular",
  method: "POST",
  rateLimit: { windowMs: 10 * 60 * 1000, max: 5 },
  maxBodyBytes: 20 * 1024,
  handle: async ({ body }) => {
    await saveFormularSubmission(body);
    return { status: 200, body: { ok: true, saved: true } };
  },
  onError: (err) => ({
    status: bodyErrorStatus(err),
    body: { ok: false, saved: false },
  }),
};
