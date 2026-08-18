import { chatRoute } from "./chat.ts";
import { chatFeedbackRoute } from "./chat-feedback.ts";
import { formularRoute } from "./formular.ts";
import type { ApiRoute } from "./route.ts";
import { vectorFetchRoute } from "./vector-fetch.ts";
import { vectorRoute } from "./vector.ts";

// The whole API surface, in one table. Served two ways from these same
// definitions: by devApiPlugin inside `vite dev` / `vite preview`, and by the
// standalone Node servers in server/*.mjs in production (each of those takes
// the subset it owns, see their entrypoints).
export const apiRoutes: ApiRoute[] = [
  formularRoute,
  chatRoute,
  chatFeedbackRoute,
  vectorRoute,
  vectorFetchRoute,
];
