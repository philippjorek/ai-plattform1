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

const formularSubmissionSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  company: z.string().optional(),
  message: z.string().min(1),
});

const dataDir = path.resolve(process.cwd(), "data");
const dataFile = path.join(dataDir, "formular-submissions.json");

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
  await writeFile(dataFile, JSON.stringify(submissions, null, 2), "utf-8");

  return submission;
}

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
    req.on("error", reject);
  });
}

const port = Number(process.env.PORT) || 8090;

const server = createServer(async (req, res) => {
  if (req.url !== "/api/formular" || req.method !== "POST") {
    res.statusCode = 404;
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ ok: false }));
    return;
  }

  try {
    const raw = await readRequestBody(req);
    const body = JSON.parse(raw);
    await saveFormularSubmission(body);

    res.statusCode = 200;
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ ok: true, saved: true }));
  } catch {
    res.statusCode = 400;
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ ok: false, saved: false }));
  }
});

server.listen(port, () => {
  console.log(`formular-server listening on http://0.0.0.0:${port}`);
});
