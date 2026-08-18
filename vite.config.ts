/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

import path from "node:path";
import { apiRoutes } from "./src/api";
import { devApiPlugin } from "./src/api/vite-plugin";

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

export default defineConfig({
  base: "/",

  build: {
    sourcemap: true,
  },

  plugins: [
    react(),
    tailwindcss(),
    devApiPlugin(apiRoutes),
    TanStackRouterVite(),
  ],

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
});
