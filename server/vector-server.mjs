// Standalone, production-capable API server exposing a lookup endpoint over
// the "Vectoraiplattform" Upstash Vector index (AIPLATTFOR-5).
//
// Unlike vite.config.ts's dev/preview-only API plugins, this is a plain
// Node HTTP server with no build step, so it can be run directly in
// production:
//
//   node server/vector-server.mjs
//
// Configure PORT via env var (default 8092). Configure
// aiplattform2_UPSTASH_VECTOR_REST_URL / aiplattform2_UPSTASH_VECTOR_REST_TOKEN
// via env vars — this repo keeps those in .env.local (see
// .env.local.example), which is loaded explicitly below since
// process.loadEnvFile() with no argument only reads ".env", not ".env.local".
// Whatever serves the site in front of this (e.g. nginx) needs to
// reverse-proxy GET /api/vector to it.

import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { Index } from "@upstash/vector";
import { applyCorsHeaders, handlePreflight } from "./cors.mjs";
import { checkRateLimit, getClientIp } from "./rate-limit.mjs";

// Resolved relative to this file, not process.cwd() — mirrors
// server/chat-server.mjs's rationale for resolving env files relative to
// this file rather than relying on cwd.
const envLocalPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  ".env.local",
);
try {
  process.loadEnvFile(envLocalPath);
} catch {
  // no .env.local file present — fine if env vars are set another way
}

function readVectorEnv() {
  const url = process.env.aiplattform2_UPSTASH_VECTOR_REST_URL;
  const token = process.env.aiplattform2_UPSTASH_VECTOR_REST_TOKEN;
  if (!url || !token) return null;
  return { url, token };
}

let cachedIndex = null;
function getIndex(env) {
  if (!cachedIndex) {
    cachedIndex = new Index({ url: env.url, token: env.token });
  }
  return cachedIndex;
}

const RATE_LIMIT = { windowMs: 5 * 60 * 1000, max: 30 };

// Mirror of listAllVectors() in src/lib/vector-store.ts — same page size and
// cap, kept in sync by hand since this server runs without a build step.
const RANGE_PAGE_SIZE = 100;
const MAX_VECTORS = 500;

async function listAllVectors(index) {
  const namespaces = await index.listNamespaces();
  const vectors = [];
  let truncated = false;

  for (const namespace of namespaces) {
    let cursor = "";
    do {
      const page = await index.range(
        {
          cursor,
          limit: RANGE_PAGE_SIZE,
          includeMetadata: true,
          includeData: true,
          includeVectors: false,
        },
        { namespace },
      );

      for (const vector of page.vectors) {
        vectors.push({
          namespace,
          id: String(vector.id),
          data: vector.data,
          metadata: vector.metadata,
        });
      }

      cursor = page.nextCursor;
    } while (cursor && vectors.length < MAX_VECTORS);

    if (vectors.length >= MAX_VECTORS) {
      truncated = true;
      break;
    }
  }

  return { namespaces, vectors, truncated };
}

const port = Number(process.env.PORT) || 8092;

const server = createServer(async (req, res) => {
  if (handlePreflight(req, res)) return;

  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

  if (url.pathname === "/api/vector/all" && req.method === "GET") {
    applyCorsHeaders(res);

    const env = readVectorEnv();
    if (!env) {
      res.statusCode = 503;
      res.setHeader("content-type", "application/json");
      res.end(
        JSON.stringify({ ok: false, error: "vector backend not configured" }),
      );
      return;
    }

    const { limited, retryAfterSeconds } = checkRateLimit(
      "vector-list",
      getClientIp(req),
      RATE_LIMIT,
    );
    if (limited) {
      res.statusCode = 429;
      res.setHeader("retry-after", String(retryAfterSeconds));
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ ok: false, error: "too many requests" }));
      return;
    }

    try {
      const listing = await listAllVectors(getIndex(env));
      res.statusCode = 200;
      res.setHeader("content-type", "application/json");
      res.end(
        JSON.stringify({ ok: true, endpoint: new URL(env.url).host, ...listing }),
      );
    } catch {
      res.statusCode = 502;
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ ok: false, error: "vector request failed" }));
    }
    return;
  }

  if (url.pathname !== "/api/vector" || req.method !== "GET") {
    applyCorsHeaders(res);
    res.statusCode = 404;
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ ok: false }));
    return;
  }

  applyCorsHeaders(res);

  const env = readVectorEnv();
  if (!env) {
    res.statusCode = 503;
    res.setHeader("content-type", "application/json");
    res.end(
      JSON.stringify({ ok: false, error: "vector backend not configured" }),
    );
    return;
  }

  const id = url.searchParams.get("id");
  if (!id) {
    res.statusCode = 400;
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ ok: false, error: "missing id" }));
    return;
  }

  const { limited, retryAfterSeconds } = checkRateLimit(
    "vector",
    getClientIp(req),
    RATE_LIMIT,
  );
  if (limited) {
    res.statusCode = 429;
    res.setHeader("retry-after", String(retryAfterSeconds));
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ ok: false, error: "too many requests" }));
    return;
  }

  try {
    const index = getIndex(env);
    const result = await index.fetch([id], { includeData: true });
    res.statusCode = 200;
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ ok: true, result: result[0] ?? null }));
  } catch (err) {
    res.statusCode = 502;
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ ok: false, error: "vector request failed" }));
  }
});

server.listen(port, () => {
  console.log(`vector-server listening on http://0.0.0.0:${port}`);
});
