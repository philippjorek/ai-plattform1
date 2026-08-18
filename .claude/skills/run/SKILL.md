---
name: run
description: Launch this app's dev server and drive it with headless Chromium to prove a change actually renders, saving proof screenshots into the repo. Use when asked to "run the app", "start the dev server", "test in the browser", or "take a screenshot" of this project specifically.
---

# Run ai-plattform2

TanStack Start app (React 19 + Vite). No `chromium-cli` is installed in
this container, so drive the browser with Playwright instead.

## Dev server

```bash
npm run dev &            # Vite, fixed port 8082, host 0.0.0.0
timeout 60 bash -c 'until curl -sf http://127.0.0.1:8082 >/dev/null; do sleep 1; done'
```

Cold start (first `npm run dev` in a fresh container) can take ~40s just
to print "ready", then Vite still has to bundle/optimize deps on the
*first* request to `/` — don't assume "ready" in the log means the app
will respond instantly.

Stop with `lsof -ti:8082 -sTCP:LISTEN | xargs -r kill` before relaunching
(the npm wrapper doesn't forward SIGTERM to the child Vite process, so
killing `$!` alone won't free the port).

## Drive it: Playwright, not `chromium-cli`

`chromium-cli` isn't available here. There is no `playwright` package in
this project's own `node_modules` either — don't add it as a
devDependency unless the user asks for that permanently. Instead there's
usually a cached copy (with Chromium already downloaded) from a prior
`npx playwright` invocation:

```bash
find /root/.npm/_npx -maxdepth 2 -type d -name playwright
```

Write your driver script, copy it *into* that cached package's directory
(Node resolves `import { chromium } from 'playwright'` relative to
`cwd`/ancestors, and the cache dir has `playwright` as a sibling in its
`node_modules`), then run it from there with plain `node`:

```bash
cp script.mjs /root/.npm/_npx/<hash>/script.mjs
node /root/.npm/_npx/<hash>/script.mjs
```

If no cached copy exists, ask the user before running `npx playwright`
fresh (it downloads a browser) or adding it as a devDependency — this is
a "missing package" per this repo's CLAUDE.md stop conditions.

## Gotchas hit while building this skill

- **Use `http://127.0.0.1:8082`, not `http://localhost:8082`.** In this
  container `localhost` resolves only to `::1` (IPv6) via `getent
  hosts`, but Vite's dev server only listens on IPv4. `curl` silently
  falls back to IPv4 fast; Playwright's `page.goto` does not fall back
  the same way and hangs until its own timeout instead.
- **This app ships an empty `<div id="root">` in the raw HTML** — it's
  client-rendered, not SSR'd for this route. `waitUntil: 'load'` or
  `'networkidle'` can resolve before React has hydrated anything,
  producing a blank white screenshot that still "succeeds" (exit 0, no
  console errors). Don't trust a blank screenshot just because the
  script didn't throw — after `goto`, explicitly wait for real content:

  ```js
  await page.waitForFunction(
    () => document.getElementById('root')?.children.length > 0,
    { timeout: 45000 }
  );
  ```
- Give `goto` a generous timeout (60s) to absorb the cold-compile cost
  described above.
- **The container is memory-constrained (~2GB total, often <600MB
  available)** while the dev server is running. `browserType.launch()`
  can stall for its full timeout (180s) and throw under that pressure
  even though nothing is actually wrong — a bare retry of the same
  script has succeeded immediately right after a launch timeout. Retry
  once before concluding the app itself is broken.

## Where screenshots go

Save proof screenshots to `src/assets/screenshots/` (create it if
missing), named `<page>-<YYYY-MM-DD>.png`. That folder is tracked in git
and auto-rendered as a gallery at the `/test` route (`src/routes/test.tsx`,
via `import.meta.glob`) — no extra wiring needed when you add a new file
there.

## Minimal driver script template

```js
import { chromium } from 'playwright';

const browser = await chromium.launch({ args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

const errors = [];
page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
page.on('pageerror', (err) => errors.push(String(err)));

await page.goto('http://127.0.0.1:8082/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction(
  () => document.getElementById('root')?.children.length > 0,
  { timeout: 45000 }
);
await page.waitForTimeout(1000); // let animations/fonts settle

await page.screenshot({ path: '/absolute/path/to/src/assets/screenshots/name-YYYY-MM-DD.png' });
console.log('CONSOLE_ERRORS:', JSON.stringify(errors));

await browser.close();
```
