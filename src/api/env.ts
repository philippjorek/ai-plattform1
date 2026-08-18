import path from "node:path";
import { fileURLToPath } from "node:url";

// Resolved relative to this file, not process.cwd() — the production
// entrypoint script can start these servers from a different working
// directory, where a bare process.loadEnvFile() would silently find nothing.
const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);

// process.loadEnvFile() with no argument only reads ".env", so the Upstash
// Vector credentials (kept in .env.local, see .env.local.example) need the
// second, explicit load.
export function loadEnvFiles() {
  for (const file of [".env", ".env.local"]) {
    try {
      process.loadEnvFile(path.resolve(repoRoot, file));
    } catch {
      // file not present — fine if those vars are set another way
    }
  }
}
