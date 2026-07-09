import { defineConfig, type Plugin } from "vite";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
//import { nitro } from "nitro/vite"; // Nitro steuert den Build ohne index.html
//import tsconfigPaths from "vite-tsconfig-paths";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

//import SiteNav from "@/components/SiteNav"
//import { nodePolyfills } from 'vite-plugin-node-polyfills'

import path from "node:path";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { z } from "zod";

const formularSubmissionSchema = z.object({
  name: z.string().min(1),
  telefon: z.string().min(1),
  email: z.string().email(),
  message: z.string().min(1),
});

// Dev/preview-only API: persists Formular submissions to data/formular-submissions.json.
// There is no production server wired up yet (nitro/Start plugin above are disabled),
// so this only runs under `vite dev` / `vite preview`.
function formularApiPlugin(): Plugin {
  const dataDir = path.resolve(process.cwd(), "data");
  const dataFile = path.join(dataDir, "formular-submissions.json");

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
      const data = formularSubmissionSchema.parse(body);

      await mkdir(dataDir, { recursive: true });
      let submissions: Array<Record<string, string>> = [];
      try {
        submissions = JSON.parse(await readFile(dataFile, "utf-8"));
      } catch {
        submissions = [];
      }
      submissions.push({ ...data, submittedAt: new Date().toISOString() });
      await writeFile(dataFile, JSON.stringify(submissions, null, 2), "utf-8");

      res.statusCode = 200;
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ ok: true }));
    } catch {
      res.statusCode = 400;
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ ok: false }));
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
      port: 8081,
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





