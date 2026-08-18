# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

A German-language portfolio/marketing site ("Service-mit-Herz") for an AI architect/engineer, built on TanStack Start (React 19 + TanStack Router, file-based routing) with Tailwind v4 and shadcn/ui (New York style). Deploys to Cloudflare via Nitro/Wrangler.

## Commands

- `npm run dev` — start dev server (Vite, fixed port 8082, host `0.0.0.0`)
- `npm run build` — production build
- `npm run build:dev` — development-mode build
- `npm run preview` — preview the production build (port 8082)
- `npm run lint` — ESLint over the whole repo
- `npm run format` — Prettier write over the whole repo
- `npm test` — run the Vitest suite once (`vitest run`)
- `npm run test:watch` — Vitest in watch mode

Tests use Vitest + Testing Library (jsdom environment, config in `vite.config.ts`'s `test` block, setup file `src/test/setup.ts`). There is no `--fix` lint script; run `eslint . --fix` directly if needed.

`bunfig.toml` configures bun's install behavior (24h supply-chain age guard on new package versions) in case bun is ever used instead of npm; `package-lock.json` is the lockfile actually kept in sync with the npm scripts.

## Architecture

- framework: react
- running inside of docker container
- port 8082

### Routing

File-based routing via `@tanstack/react-router`, routes live in `src/routes/`. `src/routeTree.gen.ts` is **auto-generated — never edit by hand**. Conventions are documented in `src/routes/README.md`:

| File | URL |
| --- | --- |
| `index.tsx` | `/` |
| `about.tsx` | `/about` |
| `users/$id.tsx` | `/users/:id` (dynamic, bare `$`) |
| `posts/{-$category}.tsx` | `/posts/:category?` (optional) |
| `files/$.tsx` | `/files/*` (splat, read via `_splat`) |
| `_layout.tsx` | layout route, renders via `<Outlet />` |
| `__root.tsx` | app shell wrapping every page |

`src/routes/__root.tsx` defines the single root shell (`RootShell`), global `<head>` meta/fonts, the `QueryClientProvider`, and the app-wide `notFoundComponent`/`errorComponent`. Do not create `src/pages/`, Next.js-style `app/` directories, or nested `_app` layouts — this project only uses TanStack Start conventions.

Current top-level pages: `/` (index), `/architecture`, `/projekte`, `/kontakt` (contact form — mid-repair, see git log), plus `ind2.tsx`, `kontakt_old.tsx`, `test.tsx` as scratch/legacy routes not linked from `SiteNav`.

### Page composition pattern

Pages share a consistent shell: `<SiteNav />` (fixed header, scroll-aware glass effect) + a `<ParallaxHero>` (full-screen scroll-parallax hero built from an image in `src/assets/`) + content sections wrapped in `<Reveal>` (IntersectionObserver-triggered fade/slide-in, toggles the `in` class) + `<SiteFooter />`. When adding a new page, follow this pattern rather than inventing a new page shell.

### HTTP API layer

Every API endpoint is declared **once** as an `ApiRoute` in `src/api/`
(`formular.ts`, `chat.ts`, `chat-feedback.ts`, `vector.ts`,
`vector-fetch.ts`), collected in `src/api/index.ts`, and served two ways from
that one table:

- `src/api/vite-plugin.ts` — `devApiPlugin(apiRoutes)`, registered in
  `vite.config.ts`, serves everything under `vite dev` / `vite preview`.
- `src/api/node-server.ts` — `createApiServer(routes)`, wrapped by the thin
  entrypoints `server/formular-server.mjs` (:8090),
  `server/chat-server.mjs` (:8091) and `server/vector-server.mjs` (:8092),
  each owning a subset of the table.

`src/api/dispatch.ts` handles everything common to all routes — preflight,
CORS, per-IP rate limiting, bounded body reading, JSON writing, mapping a
thrown error to a status. Add an endpoint by writing a route module and
adding it to the table, **not** by adding request handling to
`vite.config.ts` or to a `server/*.mjs` entrypoint.

Two rules keep this working:

- The standalone servers run their TypeScript sources directly via Node's
  native type stripping (needs **Node >= 22.18**; the `Dockerfile` pins it),
  so every relative import in the `src/api/` → `src/lib/` server graph needs
  an explicit **`.ts` extension** — plain Node ESM has no extensionless
  resolution. Do not use the `@/*` alias in these modules; Node can't resolve
  it.
- Read environment variables **inside** functions, not at module top level,
  so it never matters whether the module graph loads before or after
  `loadEnvFiles()` (`src/api/env.ts`).

### Server / SSR error handling

This app has custom SSR error-swallowing recovery, split across three files that only make sense together:

- `src/start.ts` — registers `errorMiddleware` (via `createStart`) that catches server-function/loader errors and renders a fallback HTML error page instead of letting non-HTTP errors bubble as raw 500s.
- `src/lib/error-capture.ts` — installs global `error`/`unhandledrejection` listeners that stash the last thrown error (5s TTL) so it can be recovered even after h3 has already swallowed it into a generic `{"unhandled":true,"message":"HTTPError"}` JSON 500.
- `src/server.ts` — the Cloudflare Worker `fetch` entrypoint; wraps the real TanStack server entry (`@tanstack/react-start/server-entry`), and post-processes any 5xx JSON response matching that h3-swallowed shape by consuming the captured error and re-rendering `renderErrorPage()` (from `src/lib/error-page.ts`) as HTML.

If you touch error handling, all three files need to stay in sync — the recovery only works because the capture listener, the middleware, and the worker-level normalization are chained.

`src/lib/error-reporting.ts` exports `reportError`, called from the root `errorComponent` to log uncaught render errors (with route/mechanism context) — a no-op outside the browser.

### UI components

`src/components/ui/` is shadcn/ui (New York style, Tailwind v4, `lucide` icons) — see `components.json` for the aliasing config (`@/components`, `@/lib`, `@/hooks`, `@/components/ui`). Treat these as generated/vendored: prefer regenerating via shadcn conventions over hand-editing internals, and put app-specific components in `src/components/` (not `ui/`).

### Styling

Tailwind v4 with CSS-based theming in `src/styles.css` (`@theme inline` + `:root` custom properties, OKLCH color space, "Midnight Indigo" palette). Custom utility classes used throughout (`glass`, `grid-bg`, `text-gradient`, `glow-ring`, `animate-pulse-glow`, `reveal`/`.in`) are defined there — check that file before introducing new one-off effect classes.

### Path aliases

`@/*` maps to `src/*` — configured in `tsconfig.json` (for type-checking), mirrored in `components.json` (for shadcn generation), and set explicitly as a `resolve.alias` in `vite.config.ts` (needed for actual runtime/dev-server resolution — don't remove it).

## Execution scope

Only write and execute code inside the `ai-plattform2` Docker container, and only within the project folder `/home/www/20260709/ai-plattform2`.

## Stop conditions

Stop and check in with the user instead of continuing on your own when any of these happen:

- **Wrong test command** — the command you're about to run doesn't match one of the scripts listed in `## Commands` above.
- **Missing package** — a dependency required for the task isn't installed and would need adding.
- **Unexpected error** — an error occurs that isn't an expected/normal part of the task.
- **Too many tokens** — the task has consumed more than 100,000 tokens.
