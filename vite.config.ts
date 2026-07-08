	// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.


import { defineConfig } from "vite";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
//import { nitro } from "nitro/vite"; // Nitro steuert den Build ohne index.html
//import tsconfigPaths from "vite-tsconfig-paths";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

//import SiteNav from "@/components/SiteNav"
//import { nodePolyfills } from 'vite-plugin-node-polyfills'

import path from "node:path";


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







//import { defineConfig } from "@lovable.dev/vite-tanstack-config";
//
//export default defineConfig({
//  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
//    server: { entry: "server" },
//  },



//});
