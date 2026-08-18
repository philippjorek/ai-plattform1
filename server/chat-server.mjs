// Standalone, production-capable API server for the chat widget. Proxies
// chat messages to Open WebUI's OpenAI-compatible endpoint and logs
// thumbs-up/down feedback to data/chat-feedback.json.
//
//   node server/chat-server.mjs
//
// Configure PORT (default 8091), OPEN_WEBUI_URL, OPEN_WEBUI_API_KEY and
// OPEN_WEBUI_MODEL via env vars. Whatever serves the site in front of this
// (e.g. nginx) needs to reverse-proxy POST /api/chat and
// POST /api/chat-feedback to it.
//
// The endpoints themselves are defined once in src/api/chat.ts and
// src/api/chat-feedback.ts and shared with the Vite dev/preview plugin —
// this file only picks which routes this process owns and on which port.
// Node runs the imported TypeScript directly (native type stripping,
// Node >= 22.18), so there is still no build step.

import { chatRoute } from "../src/api/chat.ts";
import { chatFeedbackRoute } from "../src/api/chat-feedback.ts";
import { loadEnvFiles } from "../src/api/env.ts";
import { startApiServer } from "../src/api/node-server.ts";

loadEnvFiles();
startApiServer("chat-server", [chatRoute, chatFeedbackRoute], 8091);
