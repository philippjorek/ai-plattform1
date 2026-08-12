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
import { applyCorsHeaders, handlePreflight } from "./cors.mjs";
import { checkRateLimit, getClientIp } from "./rate-limit.mjs";

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

const SYSTEM_PROMPT = "";
//set system-prompt in open-webui
//  'Du bist der virtuelle Assistent auf der Portfolio-Website von Philipp Jorek, ' +
//  "einem AI Architekten und Software-Engineer. Antworte kurz, freundlich und auf Deutsch. " +
//  "Hilf Besuchern, sich über Leistungen, Projekte und technische Architektur zu orientieren. " +
//  "Bei konkreten Anfragen (Angebote, Zusammenarbeit, Termin) verweise auf die Kontaktseite " +
//  "oder jorek@impli.de. Wenn du etwas nicht weißt, sag das ehrlich statt zu spekulieren.";

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

// Bounds on-disk growth of the append-only feedback file, mirroring
// src/lib/chat-feedback-store.ts — oldest-first eviction, since rate
// limiting already throttles the abuse path that would trigger eviction.
const MAX_ENTRIES = 5000;
const MAX_FILE_BYTES = 5 * 1024 * 1024;

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

  while (entries.length > MAX_ENTRIES) entries.shift();

  let serialized = JSON.stringify(entries, null, 2);
  while (
    Buffer.byteLength(serialized, "utf-8") > MAX_FILE_BYTES &&
    entries.length > 1
  ) {
    entries.shift();
    serialized = JSON.stringify(entries, null, 2);
  }

  await writeFile(feedbackDataFile, serialized, "utf-8");

  return entry;
}

class BodyTooLargeError extends Error {}

function readRequestBody(req, maxBytes) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    req.on("data", (chunk) => {
      total += chunk.length;
      if (total > maxBytes) {
        req.destroy();
        reject(new BodyTooLargeError());
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
    req.on("error", reject);
  });
}

// 40 messages * 4000 chars max content each, plus JSON overhead.
const MAX_CHAT_BODY_BYTES = 250 * 1024;
const MAX_FEEDBACK_BODY_BYTES = 20 * 1024;

const CHAT_RATE_LIMIT = { windowMs: 5 * 60 * 1000, max: 20 };
const FEEDBACK_RATE_LIMIT = { windowMs: 10 * 60 * 1000, max: 30 };

const port = Number(process.env.PORT) || 8091;

const server = createServer(async (req, res) => {
  if (handlePreflight(req, res)) return;

  if (req.url === "/api/chat-feedback" && req.method === "POST") {
    applyCorsHeaders(res);

    const { limited, retryAfterSeconds } = checkRateLimit(
      "chat-feedback",
      getClientIp(req),
      FEEDBACK_RATE_LIMIT,
    );
    if (limited) {
      res.statusCode = 429;
      res.setHeader("retry-after", String(retryAfterSeconds));
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ ok: false, error: "too many requests" }));
      return;
    }

    try {
      const raw = await readRequestBody(req, MAX_FEEDBACK_BODY_BYTES);
      const body = JSON.parse(raw);
      await saveChatFeedback(body);

      res.statusCode = 200;
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ ok: true }));
    } catch (err) {
      res.statusCode = err instanceof BodyTooLargeError ? 413 : 400;
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ ok: false }));
    }
    return;
  }

  if (req.url !== "/api/chat" || req.method !== "POST") {
    applyCorsHeaders(res);
    res.statusCode = 404;
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ ok: false }));
    return;
  }

  applyCorsHeaders(res);

  const env = readChatEnv();
  if (!env) {
    res.statusCode = 503;
    res.setHeader("content-type", "application/json");
    res.end(
      JSON.stringify({ ok: false, error: "chat backend not configured" }),
    );
    return;
  }

  const { limited, retryAfterSeconds } = checkRateLimit(
    "chat",
    getClientIp(req),
    CHAT_RATE_LIMIT,
  );
  if (limited) {
    res.statusCode = 429;
    res.setHeader("retry-after", String(retryAfterSeconds));
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ ok: false, error: "too many requests" }));
    return;
  }

  try {
    const raw = await readRequestBody(req, MAX_CHAT_BODY_BYTES);
    const body = JSON.parse(raw);
    const reply = await getChatReply(body, env);

    res.statusCode = 200;
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ ok: true, reply }));
  } catch (err) {
    res.statusCode = err instanceof BodyTooLargeError ? 413 : 400;
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ ok: false, error: "chat request failed" }));
  }
});

server.listen(port, () => {
  console.log(`chat-server listening on http://0.0.0.0:${port}`);
});
