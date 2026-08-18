/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from "vite";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
//import { nitro } from "nitro/vite"; // Nitro steuert den Build ohne index.html
//import tsconfigPaths from "vite-tsconfig-paths";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

//import SiteNav from "@/components/SiteNav"
//import { nodePolyfills } from 'vite-plugin-node-polyfills'

import path from "node:path";
import { saveFormularSubmission } from "./src/lib/formular-store";
import { getChatReply, readChatEnv } from "./src/lib/chat-client";
import { saveChatFeedback } from "./src/lib/chat-feedback-store";
import { listAllVectors } from "./src/lib/vector-store";
import { applyCorsHeaders, handlePreflight } from "./src/lib/cors";
import { checkRateLimit, getClientIp } from "./src/lib/rate-limit";

try {
  process.loadEnvFile();
} catch {
  // no .env file present — fine in environments where env vars are set another way
}

// process.loadEnvFile() with no argument only reads ".env", so the Upstash
// Vector credentials (kept in .env.local, see .env.local.example) need an
// explicit second load — same rationale as server/vector-server.mjs.
try {
  process.loadEnvFile(path.resolve(process.cwd(), ".env.local"));
} catch {
  // no .env.local present — fine if those vars are set another way
}

// Shared by the three dev/preview-only API plugins below, mirroring the
// bounded body reading in server/formular-server.mjs and
// server/chat-server.mjs — rejects before JSON.parse ever runs on an
// oversized body, independent of the entry-count cap on the JSON stores.
class BodyTooLargeError extends Error {}

function readBoundedBody(
  req: import("node:http").IncomingMessage,
  maxBytes: number,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let total = 0;
    req.on("data", (chunk: Buffer) => {
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

// Dev/preview-only API: persists Formular submissions to data/formular-submissions.json.
// There is no production server wired up yet (nitro/Start plugin above are disabled),
// so this only runs under `vite dev` / `vite preview`. For a production-capable
// equivalent that runs without Vite, see server/formular-server.mjs.
const FORMULAR_MAX_BODY_BYTES = 20 * 1024;
const FORMULAR_RATE_LIMIT = { windowMs: 10 * 60 * 1000, max: 5 };

function formularApiPlugin(): Plugin {
  const handler = async (
    req: import("node:http").IncomingMessage,
    res: import("node:http").ServerResponse,
    next: () => void,
  ) => {
    if (handlePreflight(req, res)) return;
    if (req.url !== "/api/formular" || req.method !== "POST") {
      return next();
    }

    applyCorsHeaders(res);

    const { limited, retryAfterSeconds } = checkRateLimit(
      "formular",
      getClientIp(req),
      FORMULAR_RATE_LIMIT,
    );
    if (limited) {
      res.statusCode = 429;
      res.setHeader("retry-after", String(retryAfterSeconds));
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ ok: false, error: "too many requests" }));
      return;
    }

    try {
      const raw = await readBoundedBody(req, FORMULAR_MAX_BODY_BYTES);
      const body = JSON.parse(raw);
      await saveFormularSubmission(body);

      res.statusCode = 200;
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ ok: true, saved: true }));
    } catch (err) {
      res.statusCode = err instanceof BodyTooLargeError ? 413 : 400;
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ ok: false, saved: false }));
    }
  };

  return {
    name: "formular-api",
    configureServer(server) {
      server.middlewares.use((req, res, next) => void handler(req, res, next));
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => void handler(req, res, next));
    },
  };
}

// Dev/preview-only API: proxies chat messages to Open WebUI. Same caveat as
// formularApiPlugin above — only runs under `vite dev` / `vite preview`.
// For production, see server/chat-server.mjs.
// 40 messages * 4000 chars max content each, plus JSON overhead.
const CHAT_MAX_BODY_BYTES = 250 * 1024;
const CHAT_RATE_LIMIT = { windowMs: 5 * 60 * 1000, max: 20 };

function chatApiPlugin(): Plugin {
  const handler = async (
    req: import("node:http").IncomingMessage,
    res: import("node:http").ServerResponse,
    next: () => void,
  ) => {
    if (handlePreflight(req, res)) return;
    if (req.url !== "/api/chat" || req.method !== "POST") {
      return next();
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
      const raw = await readBoundedBody(req, CHAT_MAX_BODY_BYTES);
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
  };

  return {
    name: "chat-api",
    configureServer(server) {
      server.middlewares.use((req, res, next) => void handler(req, res, next));
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => void handler(req, res, next));
    },
  };
}

// Dev/preview-only API: logs thumbs-up/down feedback on chat replies to
// data/chat-feedback.json. Same caveat as the plugins above — only runs
// under `vite dev` / `vite preview`. For production, see server/chat-server.mjs.
const FEEDBACK_MAX_BODY_BYTES = 20 * 1024;
const FEEDBACK_RATE_LIMIT = { windowMs: 10 * 60 * 1000, max: 30 };

function chatFeedbackApiPlugin(): Plugin {
  const handler = async (
    req: import("node:http").IncomingMessage,
    res: import("node:http").ServerResponse,
    next: () => void,
  ) => {
    if (handlePreflight(req, res)) return;
    if (req.url !== "/api/chat-feedback" || req.method !== "POST") {
      return next();
    }

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
      const raw = await readBoundedBody(req, FEEDBACK_MAX_BODY_BYTES);
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
  };

  return {
    name: "chat-feedback-api",
    configureServer(server) {
      server.middlewares.use((req, res, next) => void handler(req, res, next));
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => void handler(req, res, next));
    },
  };
}

// Dev/preview-only API: lists every record in the "Vectoraiplattform" Upstash
// Vector index for the /test inspector page. Same caveat as the plugins above
// — only runs under `vite dev` / `vite preview`. For production, see
// server/vector-server.mjs.
const VECTOR_LIST_RATE_LIMIT = { windowMs: 5 * 60 * 1000, max: 30 };

function vectorApiPlugin(): Plugin {
  const handler = async (
    req: import("node:http").IncomingMessage,
    res: import("node:http").ServerResponse,
    next: () => void,
  ) => {
    if (handlePreflight(req, res)) return;
    if (req.url?.split("?")[0] !== "/api/vector/all" || req.method !== "GET") {
      return next();
    }

    applyCorsHeaders(res);

    const { limited, retryAfterSeconds } = checkRateLimit(
      "vector-list",
      getClientIp(req),
      VECTOR_LIST_RATE_LIMIT,
    );
    if (limited) {
      res.statusCode = 429;
      res.setHeader("retry-after", String(retryAfterSeconds));
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ ok: false, error: "too many requests" }));
      return;
    }

    try {
      const listing = await listAllVectors();
      if (!listing) {
        res.statusCode = 503;
        res.setHeader("content-type", "application/json");
        res.end(
          JSON.stringify({ ok: false, error: "vector backend not configured" }),
        );
        return;
      }

      res.statusCode = 200;
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ ok: true, ...listing }));
    } catch {
      res.statusCode = 502;
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ ok: false, error: "vector request failed" }));
    }
  };

  return {
    name: "vector-api",
    configureServer(server) {
      server.middlewares.use((req, res, next) => void handler(req, res, next));
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => void handler(req, res, next));
    },
  };
}

export default defineConfig({
  base: "/",
  build: {
    sourcemap: true,
  },

  //  build: {
  //    rollupOptions: {
  //      input: '.output/server/index.mjs' // Stellen Sie sicher, dass dieser Pfad korrekt ist
  //    }
  //  },

  //  preview: {
  //    port: 8081,
  //    strictPort: true
  //  },

  //	build: {
  //	      host: "0.0.0.0",
  //	port: 8081,
  //	},

  plugins: [
    //	nodePolyfills(),

    //    tsconfigPaths(),
    react(),
    tailwindcss(),
    formularApiPlugin(),
    chatApiPlugin(),
    chatFeedbackApiPlugin(),
    vectorApiPlugin(),
    //    TanStackStartVite({
    TanStackRouterVite(
      // Configure any specific TanStack Start settings here if needed
      //deployment: "vercel",
      // }
    ),
    //    nitro({
    // Falls du zu Vercel, Netlify oder Cloudflare deployst,
    // kannst du hier den Preset eintragen (z.B. preset: "vercel")
    //    }),
  ],

  //  resolve: {
  //    alias: {
  //      "@": path.resolve(process.cwd(), "src"),
  //    },
  //  },

  server: {
    host: "0.0.0.0",
    port: 8082,
    watch: {
      // Formular submissions are written to data/formular-submissions.json at
      // runtime; without this, every submit is seen as a source change and
      // Vite force-reloads the page mid-request, aborting the fetch.
      ignored: ["**/data/**"],
    },
  },

  resolve: {
    alias: {
      "@": path.resolve(process.cwd(), "src"),
    },
  },

  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    globals: true,
  },

  //  resolve: {
  //   tsconfigPaths: true, // <-- Aktiviert die native Pfad-Auflsung aus deiner tsconfig.json
  //  },

  //  vite: {
  //    server: {
  //      host: "0.0.0.0",
  //      port: 8081,
  //    }
  //  }
});
