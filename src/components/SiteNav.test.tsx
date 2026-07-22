import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { SiteNav } from "./SiteNav";

// SiteNav renders <Link> from @tanstack/react-router, which needs a router
// context to resolve `to`/active state. We build a minimal in-memory route
// tree here instead of the app's real routeTree.gen.ts, so this test only
// depends on SiteNav's own paths and stays isolated from unrelated routes.
async function renderSiteNav(initialPath = "/") {
  const rootRoute = createRootRoute({ component: () => <SiteNav /> });
  const childRoutes = ["/", "/architecture", "/projekte", "/kontakt"].map(
    (path) =>
      createRoute({
        getParentRoute: () => rootRoute,
        path,
        component: () => null,
      }),
  );

  const router = createRouter({
    routeTree: rootRoute.addChildren(childRoutes),
    history: createMemoryHistory({ initialEntries: [initialPath] }),
  });

  await router.load();
  render(<RouterProvider router={router} />);
}

describe("SiteNav", () => {
  it("renders the brand and primary nav links", async () => {
    await renderSiteNav("/");

    expect(
      screen.getByRole("link", { name: /service-mit-herz/i }),
    ).toBeInTheDocument();
    for (const label of ["Home", "Architecture", "Projekte", "Kontakt"]) {
      expect(screen.getByRole("link", { name: label })).toBeInTheDocument();
    }
  });

  it("marks the link matching the current route as active", async () => {
    await renderSiteNav("/architecture");

    expect(screen.getByRole("link", { name: "Architecture" })).toHaveClass(
      "text-foreground",
    );
    expect(screen.getByRole("link", { name: "Home" })).not.toHaveClass(
      "text-foreground",
    );
  });

  it("opens and closes the mobile menu on toggle", async () => {
    await renderSiteNav("/");

    expect(screen.queryAllByRole("link", { name: "Kontakt" })).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: /menu/i }));
    expect(screen.queryAllByRole("link", { name: "Kontakt" })).toHaveLength(2);

    fireEvent.click(screen.getByRole("button", { name: /menu/i }));
    expect(screen.queryAllByRole("link", { name: "Kontakt" })).toHaveLength(1);
  });

  it("closes the mobile menu after clicking a link in it", async () => {
    await renderSiteNav("/");

    fireEvent.click(screen.getByRole("button", { name: /menu/i }));
    const mobileLinks = screen.getAllByRole("link", { name: "Projekte" });
    fireEvent.click(mobileLinks[mobileLinks.length - 1]);

    expect(screen.queryAllByRole("link", { name: "Projekte" })).toHaveLength(1);
  });

  it("switches from the transparent to the glass header style once scrolled", async () => {
    await renderSiteNav("/");
    const header = screen.getByRole("banner");
    expect(header).toHaveClass("bg-transparent");
    expect(header).not.toHaveClass("glass");

    Object.defineProperty(window, "scrollY", {
      configurable: true,
      value: 100,
    });
    fireEvent.scroll(window);

    expect(header).toHaveClass("glass");
    expect(header).not.toHaveClass("bg-transparent");
  });
});
