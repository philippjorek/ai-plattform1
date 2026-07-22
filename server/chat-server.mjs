// Standalone, production-capable API server for the chat widget.
// Proxies chat messages to Open WebUI's OpenAI-compatible endpoint.
//
// Unlike vite.config.ts's chatApiPlugin (which only runs inside the Vite
// dev/preview process), this is a plain Node HTTP server with no build step,
// so it can be run directly in production:
//
//   node server/chat-server.mjs
//
// Configure PORT (default 8091), OPEN_WEBUI_URL, OPEN_WEBUI_API_KEY and
// OPEN_WEBUI_MODEL via env vars (e.g. a .env file loaded automatically).
// Whatever serves the site in front of this (e.g. nginx) needs to
// reverse-proxy POST /api/chat to it.

import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

// Resolved relative to this file, not process.cwd() — the production
// entrypoint script starts this with cwd "/", where a bare
// process.loadEnvFile() would silently fail to find .env.
const envPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  ".env",
);
try {
  process.loadEnvFile(envPath);
} catch {
  // no .env file present — fine if env vars are set another way
}

const chatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(4000),
});

const chatRequestSchema = z.object({
  messages: z.array(chatMessageSchema).min(1).max(40),
});

const SYSTEM_PROMPT =
  'Du bist der virtuelle Assistent auf der Portfolio-Website von Philipp Jorek, ' +
  "einem AI Architekten und Software-Engineer. Antworte kurz, freundlich und auf Deutsch. " +
  "Hilf Besuchern, sich über Leistungen, Projekte und technische Architektur zu orientieren. " +
  "Bei konkreten Anfragen (Angebote, Zusammenarbeit, Termin) verweise auf die Kontaktseite " +
  "oder jorek@impli.de. Wenn du etwas nicht weißt, sag das ehrlich statt zu spekulieren.";

function readChatEnv() {
  const baseUrl = process.env.OPEN_WEBUI_URL;
  const apiKey = process.env.OPEN_WEBUI_API_KEY;
  const model = process.env.OPEN_WEBUI_MODEL;
  if (!baseUrl || !apiKey || !model) return null;
  return { baseUrl, apiKey, model };
}

async function getChatReply(input, env) {
  const { messages } = chatRequestSchema.parse(input);

  const res = await fetch(`${env.baseUrl}/api/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${env.apiKey}`,
    },
    body: JSON.stringify({
      model: env.model,
      messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
    }),
  });

  if (!res.ok) {
    throw new Error(`open-webui request failed: ${res.status}`);
  }

  const data = await res.json();
  const reply = data.choices?.[0]?.message?.content?.trim();
  if (!reply) throw new Error("open-webui returned no content");
  return reply;
}

const chatFeedbackSchema = z.object({
  messageId: z.number(),
  rating: z.enum(["up", "down"]),
  text: z.string().max(4000).optional(),
});

const feedbackDataDir = path.resolve(process.cwd(), "data");
const feedbackDataFile = path.join(feedbackDataDir, "chat-feedback.json");

async function saveChatFeedback(input) {
  const data = chatFeedbackSchema.parse(input);

  await mkdir(feedbackDataDir, { recursive: true });

  let entries = [];
  try {
    const raw = JSON.parse(await readFile(feedbackDataFile, "utf-8"));
    if (Array.isArray(raw)) entries = raw;
  } catch {
    entries = [];
  }

  const entry = { ...data, loggedAt: new Date().toISOString() };
  entries.push(entry);
  await writeFile(feedbackDataFile, JSON.stringify(entries, null, 2), "utf-8");

  return entry;
}

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
    req.on("error", reject);
  });
}

const port = Number(process.env.PORT) || 8091;

const server = createServer(async (req, res) => {
  if (req.url === "/api/chat-feedback" && req.method === "POST") {
    try {
      const raw = await readRequestBody(req);
      const body = JSON.parse(raw);
      await saveChatFeedback(body);

      res.statusCode = 200;
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ ok: true }));
    } catch {
      res.statusCode = 400;
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ ok: false }));
    }
    return;
  }

  if (req.url !== "/api/chat" || req.method !== "POST") {
    res.statusCode = 404;
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ ok: false }));
    return;
  }

  const env = readChatEnv();
  if (!env) {
    res.statusCode = 503;
    res.setHeader("content-type", "application/json");
    res.end(
      JSON.stringify({ ok: false, error: "chat backend not configured" }),
    );
    return;
  }

  try {
    const raw = await readRequestBody(req);
    const body = JSON.parse(raw);
    const reply = await getChatReply(body, env);

    res.statusCode = 200;
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ ok: true, reply }));
  } catch {
    res.statusCode = 400;
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ ok: false, error: "chat request failed" }));
  }
});

server.listen(port, () => {
  console.log(`chat-server listening on http://0.0.0.0:${port}`);
});
