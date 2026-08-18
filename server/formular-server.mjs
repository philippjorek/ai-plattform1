// Standalone, production-capable API server for the Kontakt form.
// Persists submissions to data/formular-submissions.json.
//
//   node server/formular-server.mjs
//
// Configure PORT via env var (default 8090). Whatever serves the site in
// front of this (e.g. nginx) needs to reverse-proxy POST /api/formular to it.
//
// The endpoint itself is defined once in src/api/formular.ts and shared with
// the Vite dev/preview plugin — this file only picks which routes this
// process owns and on which port. Node runs the imported TypeScript directly
// (native type stripping, Node >= 22.18), so there is still no build step.

import { loadEnvFiles } from "../src/api/env.ts";
import { formularRoute } from "../src/api/formular.ts";
import { startApiServer } from "../src/api/node-server.ts";

loadEnvFiles();
startApiServer("formular-server", [formularRoute], 8090);
