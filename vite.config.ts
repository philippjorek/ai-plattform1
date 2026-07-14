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

try {
  process.loadEnvFile();
} catch {
  // no .env file present — fine in environments where env vars are set another way
}

// Dev/preview-only API: persists Formular submissions to data/formular-submissions.json.
// There is no production server wired up yet (nitro/Start plugin above are disabled),
// so this only runs under `vite dev` / `vite preview`. For a production-capable
// equivalent that runs without Vite, see server/formular-server.mjs.
function formularApiPlugin(): Plugin {
  const handler = async (
    req: import("node:http").IncomingMessage,
    res: import("node:http").ServerResponse,
    next: () => void,
  ) => {
    if (req.url !== "/api/formular" || req.method !== "POST") {
      return next();
    }

    try {
      const chunks: Buffer[] = [];
      for await (const chunk of req) chunks.push(chunk as Buffer);
      const body = JSON.parse(Buffer.concat(chunks).toString("utf-8"));
      await saveFormularSubmission(body);

      res.statusCode = 200;
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ ok: true, saved: true }));
    } catch {
      res.statusCode = 400;
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
function chatApiPlugin(): Plugin {
  const handler = async (
    req: import("node:http").IncomingMessage,
    res: import("node:http").ServerResponse,
    next: () => void,
  ) => {
    if (req.url !== "/api/chat" || req.method !== "POST") {
      return next();
    }

    const env = readChatEnv();
    if (!env) {
      res.statusCode = 503;
      res.setHeader("content-type", "application/json");
      res.end(
        JSON.stringify({ ok: false, error: "chat backend not configured" }),
      );
      return;
    }

    try {
      const chunks: Buffer[] = [];
      for await (const chunk of req) chunks.push(chunk as Buffer);
      const body = JSON.parse(Buffer.concat(chunks).toString("utf-8"));
      const reply = await getChatReply(body, env);

      res.statusCode = 200;
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ ok: true, reply }));
    } catch {
      res.statusCode = 400;
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
