# Tests

This documents the actual test suite as it exists in the codebase — every
test file, its setup, and every case it covers. For the underlying Vitest
setup and testing patterns (router-context helper, etc.), see
`test/README.md` at the repo root; this file additionally covers
`src/test/pages.test.tsx`, which that doc doesn't.

## Setup

- Runner: **Vitest**, configured inline in the `test` block of the root
  `vite.config.ts` — no separate `vitest.config.ts`. This means tests share
  the app's real Vite plugins and the `@/*` alias.
- Environment: `jsdom`.
- Globals: `true` — `describe`/`it`/`expect`/`vi` are available without
  importing them.
- Setup file: `src/test/setup.ts` — loads `@testing-library/jest-dom`
  matchers (`toBeInTheDocument`, `toHaveClass`, etc.).
- Test files live next to the code they cover, named `*.test.ts(x)`.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run test` | run the full suite once (`vitest run`) |
| `npm run test:watch` | watch mode |

## `src/lib/utils.test.ts`

Unit tests for the `cn` class-name helper (`clsx` + `tailwind-merge`). No
providers needed — plain function calls.

- joins plain class names
- drops falsy values (`false`, `undefined`, `null`)
- merges conflicting Tailwind classes, keeping the last one
- applies conditional classes from an object (`{ active: true, hidden: false }`)

## `src/components/SiteNav.test.tsx`

Tests the fixed header nav. Renders `<SiteNav />` inside a **minimal
in-memory route tree** (`/`, `/architecture`, `/projekte`, `/kontakt`) built
just for this test, rather than the app's real `routeTree.gen.ts` — this
keeps the test scoped to `SiteNav`'s own links and isolated from unrelated
routes (some of which pull in loaders/components mid-repair).

- renders the brand link and the primary nav links (Home, Architecture,
  Projekte, Kontakt)
- marks the link matching the current route as active (`text-foreground`
  class present on the current link, absent on the others)
- opens and closes the mobile menu when the burger button is toggled
- closes the mobile menu again after clicking a link inside it
- switches the header from the transparent style to the `glass` style once
  `window.scrollY` passes the 30px threshold — simulated via
  `Object.defineProperty(window, "scrollY", ...)` + `fireEvent.scroll(window)`,
  since jsdom doesn't perform real scrolling

## `src/test/pages.test.tsx`

Smoke tests every real route against the app's **actual** generated route
tree (`@/routeTree.gen`), not a stub — this is the one place that exercises
real page components end to end (loaders, `<SiteNav>`, error/not-found
boundaries).

The path list is hardcoded and deliberately **not** derived automatically
from the route tree, so a newly added route can't silently end up untested:
`/`, `/architecture`, `/datenschutz`, `/impressum`, `/ind2`, `/kontakt`,
`/projekte`. If a route is added or removed, this list must be updated by
hand.

- `it.each` over that path list: each route renders without falling back to
  the shared error page ("this page didn't load") or the 404 page, and
  renders the shared `<SiteNav />` header (checked via `role="banner"`)
- `/test` renders without falling back to the error page — checked
  separately from the list above because it's a bare scratch route with no
  `<SiteNav />`, so the shared banner assertion doesn't apply
- an unknown route (`/this-route-does-not-exist`) shows the 404 page, not
  the generic error page

## Coverage gaps

Not currently tested:

- `src/routes/kontakt.tsx` form submission behavior (only that the page
  renders, via `pages.test.tsx`) — no test posts to `/api/formular` or
  asserts on `src/lib/formular-store.ts`.
- `src/components/ChatWidget.tsx` — sending a message, thumbs-up/down
  feedback, or the offline fallback message are untested.
- `src/lib/chat-client.ts`, `src/lib/chat-feedback-store.ts`,
  `src/lib/formular-store.ts` — no unit tests on the validation/persistence
  logic itself.
- `src/lib/error-capture.ts`, `src/lib/error-page.ts`,
  `src/lib/error-reporting.ts` — the SSR/error-recovery scaffolding (see
  `docs/architecture/architecture.md`) has no tests, though it's also not
  currently wired into the live build.
