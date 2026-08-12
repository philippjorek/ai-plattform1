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
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { applyCorsHeaders, handlePreflight } from "./cors.mjs";
import { checkRateLimit, getClientIp } from "./rate-limit.mjs";

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
