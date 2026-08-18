// Standalone, production-capable API server over the "Vectoraiplattform"
// Upstash Vector index (AIPLATTFOR-5): GET /api/vector/all lists the index,
// GET /api/vector?id=... fetches one record.
//
//   node server/vector-server.mjs
//
// Configure PORT via env var (default 8092), plus
// aiplattform2_UPSTASH_VECTOR_REST_URL / aiplattform2_UPSTASH_VECTOR_REST_TOKEN
// — this repo keeps those in .env.local (see .env.local.example). Whatever
// serves the site in front of this (e.g. nginx) needs to reverse-proxy
// GET /api/vector and GET /api/vector/all to it.
//
// The endpoints themselves are defined once in src/api/vector.ts and
// src/api/vector-fetch.ts and shared with the Vite dev/preview plugin — this
// file only picks which routes this process owns and on which port. Node runs
// the imported TypeScript directly (native type stripping, Node >= 22.18), so
// there is still no build step.

import { loadEnvFiles } from "../src/api/env.ts";
import { startApiServer } from "../src/api/node-server.ts";
import { vectorFetchRoute } from "../src/api/vector-fetch.ts";
import { vectorRoute } from "../src/api/vector.ts";

loadEnvFiles();
startApiServer("vector-server", [vectorRoute, vectorFetchRoute], 8092);
