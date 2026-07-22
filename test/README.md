# Tests

Tests run on **Vitest**, configured in the `test` block of the root
`vite.config.ts` (not a separate `vitest.config.ts`) so tests share the
app's Vite plugins and the `@/*` alias automatically.

- environment: `jsdom`
- globals: `true` — `describe`/`it`/`expect`/`vi` are available without importing them
- setup file: `src/test/setup.ts` — loads `@testing-library/jest-dom` matchers
  (`toBeInTheDocument`, `toHaveClass`, etc.)

Test files live next to the code they cover, named `*.test.ts(x)`.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run test` | run the full suite once (`vitest run`) |
| `npm run test:watch` | watch mode |

## Plain unit tests

For pure functions (e.g. `src/lib/utils.test.ts`), just import from Vitest
and the module under test — no providers needed.

## Component tests that use `<Link>` / routing

Components that render `<Link>` from `@tanstack/react-router` (e.g.
`SiteNav`) need a router context to resolve `to` and active-state props —
rendering them with plain `@testing-library/react` `render()` throws.

`src/components/SiteNav.test.tsx` shows the pattern: build a **minimal
in-memory route tree** scoped to only the paths the component under test
actually links to, rather than importing the app's real
`routeTree.gen.ts`:

```tsx
const rootRoute = createRootRoute({ component: () => <ComponentUnderTest /> });
const childRoutes = ["/", "/some-path"].map((path) =>
  createRoute({ getParentRoute: () => rootRoute, path, component: () => null }),
);
const router = createRouter({
  routeTree: rootRoute.addChildren(childRoutes),
  history: createMemoryHistory({ initialEntries: [initialPath] }),
});
await router.load();
render(<RouterProvider router={router} />);
```

Using the real route tree instead would pull in every route's loaders and
components (including ones mid-repair, like `/kontakt` — see git log) and
turn a focused component test into an integration test of the whole app.
Keep the scoped route tree pattern for any future test that renders a
`<Link>`.

### What `SiteNav.test.tsx` covers

- brand link and all primary nav links render
- the link matching the current route gets the active (`text-foreground`) class
- the mobile menu opens/closes via the burger button, and closes again after
  clicking a link inside it
- the header switches from the transparent to the `glass` style once
  `window.scrollY` passes the 30px threshold (simulated via
  `Object.defineProperty(window, "scrollY", ...)` + `fireEvent.scroll(window)`,
  since jsdom doesn't perform real scrolling)
