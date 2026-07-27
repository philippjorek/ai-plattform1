import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  RouterProvider,
  createMemoryHistory,
  createRouter,
} from "@tanstack/react-router";
import { QueryClient } from "@tanstack/react-query";
import { routeTree } from "@/routeTree.gen";

// Every real page currently wired into src/routeTree.gen.ts. If a route is
// added or removed, update this list — it's intentionally not derived
// automatically so a route can't silently start being untested.
// "/test" is a bare scratch route with no <SiteNav /> (see CLAUDE.md), so it
// gets its own test below instead of the shared banner assertion.
const paths = [
  "/",
  "/architecture",
  "/datenschutz",
  "/impressum",
  "/ind2",
  "/kontakt",
  "/projekte",
];

async function renderPath(path: string) {
  const router = createRouter({
    routeTree,
    context: { queryClient: new QueryClient() },
    history: createMemoryHistory({ initialEntries: [path] }),
  });

  await router.load();
  render(<RouterProvider router={router} />);
  return router;
}

describe("site pages", () => {
  it.each(paths)("%s renders without falling back to the error page", async (path) => {
    await renderPath(path);

    expect(
      screen.queryByText(/this page didn't load/i),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/^404$/)).not.toBeInTheDocument();
    // Every real page renders the shared header via <SiteNav />.
    expect(screen.getByRole("banner")).toBeInTheDocument();
  });

  it("/test renders without falling back to the error page", async () => {
    await renderPath("/test");

    expect(
      screen.queryByText(/this page didn't load/i),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/^404$/)).not.toBeInTheDocument();
  });

  it("shows the 404 page instead of the error page for an unknown route", async () => {
    await renderPath("/this-route-does-not-exist");

    expect(screen.getByText(/^404$/)).toBeInTheDocument();
    expect(
      screen.queryByText(/this page didn't load/i),
    ).not.toBeInTheDocument();
  });
});
