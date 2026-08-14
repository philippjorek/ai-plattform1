// Standalone, production-capable API server for the Kontakt form.
// Persists submissions to data/formular-submissions.json.
//
// Unlike vite.config.ts's formularApiPlugin (which only runs inside the Vite
// dev/preview process), this is a plain Node HTTP server with no build step,
// so it can be run directly in production:
//
//   node server/formular-server.mjs
//
// Configure PORT via env var (default 8090). Whatever serves the site in
// front of this (e.g. nginx) needs to reverse-proxy POST /api/formular to it.

import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { Index } from "@upstash/vector";
import { applyCorsHeaders, handlePreflight } from "./cors.mjs";
import { checkRateLimit, getClientIp } from "./rate-limit.mjs";

// Resolved relative to this file, not process.cwd() — mirrors
// server/vector-server.mjs's rationale. Needed now that this server also
// talks to the vector backend and requires its credentials.
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

// Mirrors src/lib/vector-store.ts's vectordatabasetest() — this is the
// plain-Node production server, so it can't import the Vite-only TS module
// and duplicates it here, same as server/vector-server.mjs duplicates its
// own env/index setup instead of sharing with the dev plugin.
const VECTOR_NAMESPACE = "kontakt";

function readVectorEnv() {
  const url = process.env.aiplattform2_UPSTASH_VECTOR_REST_URL;
  const token = process.env.aiplattform2_UPSTASH_VECTOR_REST_TOKEN;
  if (!url || !token) return null;
  return { url, token };
}

let cachedVectorIndex = null;
function getVectorIndex(env) {
  if (!cachedVectorIndex) {
    cachedVectorIndex = new Index({ url: env.url, token: env.token });
  }
  return cachedVectorIndex;
}

// Best-effort mirror of the JSON write into the "Vectoraiplattform" vector
// index — additive, not a replacement. Swallows its own errors so a
// missing/down vector backend never breaks the Kontakt form response.
async function vectordatabasetest(submission) {
  const env = readVectorEnv();
  if (!env) return false;

  const id = `formular-${submission.submittedAt}`;
  const data = [
    submission.name,
    submission.company,
    submission.email,
    submission.message,
  ]
    .filter(Boolean)
    .join(" — ");

  try {
    const index = getVectorIndex(env);
    await index.upsert(
      { id, data, metadata: { ...submission } },
      { namespace: VECTOR_NAMESPACE },
    );
    return true;
  } catch {
    return false;
  }
}

const formularSubmissionSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().max(320),
  company: z.string().max(200).optional(),
  message: z.string().min(1).max(5000),
});

const dataDir = path.resolve(process.cwd(), "data");
const dataFile = path.join(dataDir, "formular-submissions.json");

// Bounds on-disk growth of the append-only submissions file, mirroring
// src/lib/formular-store.ts — oldest-first eviction, since rate limiting
// already throttles the abuse path that would trigger eviction.
const MAX_ENTRIES = 5000;
const MAX_FILE_BYTES = 5 * 1024 * 1024;

async function saveFormularSubmission(input) {
  const data = formularSubmissionSchema.parse(input);

  await mkdir(dataDir, { recursive: true });

  let submissions = [];
  try {
    const raw = JSON.parse(await readFile(dataFile, "utf-8"));
    if (Array.isArray(raw)) submissions = raw;
  } catch {
    submissions = [];
  }

  const submission = { ...data, submittedAt: new Date().toISOString() };
  submissions.push(submission);

  while (submissions.length > MAX_ENTRIES) submissions.shift();

  let serialized = JSON.stringify(submissions, null, 2);
  while (
    Buffer.byteLength(serialized, "utf-8") > MAX_FILE_BYTES &&
    submissions.length > 1
  ) {
    submissions.shift();
    serialized = JSON.stringify(submissions, null, 2);
  }

  await writeFile(dataFile, serialized, "utf-8");

  // Additionally mirror into the "Vectoraiplattform" vector index. Best
  // effort: vectordatabasetest() swallows its own errors, so a missing/down
  // vector backend never breaks the JSON-backed Kontakt submission flow.
  await vectordatabasetest(submission);

  return submission;
}

const MAX_BODY_BYTES = 20 * 1024;

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

const RATE_LIMIT = { windowMs: 10 * 60 * 1000, max: 5 };

const port = Number(process.env.PORT) || 8090;

const server = createServer(async (req, res) => {
  if (handlePreflight(req, res)) return;

  if (req.url !== "/api/formular" || req.method !== "POST") {
    applyCorsHeaders(res);
    res.statusCode = 404;
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ ok: false }));
    return;
  }

  applyCorsHeaders(res);

  const { limited, retryAfterSeconds } = checkRateLimit(
    "formular",
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
    const raw = await readRequestBody(req, MAX_BODY_BYTES);
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
});

server.listen(port, () => {
  console.log(`formular-server listening on http://0.0.0.0:${port}`);
});
