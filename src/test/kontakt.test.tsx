import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  RouterProvider,
  createMemoryHistory,
  createRouter,
} from "@tanstack/react-router";
import { QueryClient } from "@tanstack/react-query";
import { routeTree } from "@/routeTree.gen";

async function renderKontakt() {
  const router = createRouter({
    routeTree,
    context: { queryClient: new QueryClient() },
    history: createMemoryHistory({ initialEntries: ["/kontakt"] }),
  });

  await router.load();
  render(<RouterProvider router={router} />);
}

function getSubmitButton() {
  return screen.getByRole("button", {
    name: /nachricht senden|wird gesendet|gesendet — danke/i,
  });
}

// The "Unternehmen" (company) field is required in the UI (Field
// hardcodes `required`) even though it's optional in the backend zod
// schema — a pre-existing inconsistency, not something introduced here.
// All four text fields plus the Datenschutz checkbox must be filled/checked
// for the native HTML5 validation jsdom enforces on submit to let the
// submit handler run at all.
async function fillRequiredFields(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Name"), "Ada Lovelace");
  await user.type(screen.getByLabelText("Email"), "ada@example.com");
  await user.type(screen.getByLabelText("Unternehmen"), "Analytical Engines");
  await user.type(
    screen.getByLabelText("Worum geht's?"),
    "Ich hätte Interesse an einem Projekt.",
  );
  await user.click(screen.getByRole("checkbox", { name: /datenschutz/i }));
}

describe("kontakt.tsx submission flow", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    // Deliberately not vi.unstubAllGlobals() here: that would also tear
    // down the IntersectionObserver stub src/test/setup.ts installs once
    // for the whole file (Reveal.tsx needs it). beforeEach re-stubs fetch
    // fresh every test, so nothing further is needed to avoid leakage.
    vi.restoreAllMocks();
  });

  it("submits successfully: button text cycles, success message shown, stays disabled", async () => {
    const user = userEvent.setup();
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, saved: true }),
    });

    await renderKontakt();
    await fillRequiredFields(user);
    await user.click(getSubmitButton());

    await waitFor(() =>
      expect(screen.getByText(/gesendet — danke!/i)).toBeInTheDocument(),
    );
    // The hero subtitle also mentions "24 Stunden", so match the success
    // message's exact wording rather than a loose "24 stunden" substring.
    expect(screen.getByText(/nachricht gesendet\./i)).toBeInTheDocument();
    expect(
      screen.getByText(/ich melde mich innerhalb von 24 stunden\./i),
    ).toBeInTheDocument();
    expect(getSubmitButton()).toBeDisabled();
    expect(fetch).toHaveBeenCalledWith(
      "/api/formular",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("shows an error and re-enables the button on a non-ok response", async () => {
    const user = userEvent.setup();
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      json: async () => ({}),
    });

    await renderKontakt();
    await fillRequiredFields(user);
    await user.click(getSubmitButton());

    await waitFor(() =>
      expect(
        screen.getByText(/fehler\. bitte versuch es später erneut/i),
      ).toBeInTheDocument(),
    );
    expect(getSubmitButton()).not.toBeDisabled();
    expect(getSubmitButton()).toHaveTextContent("Nachricht senden");
  });

  it("shows the same error path when fetch rejects outright", async () => {
    const user = userEvent.setup();
    (fetch as ReturnType<typeof vi.fn>).mockRejectedValue(
      new TypeError("network error"),
    );

    await renderKontakt();
    await fillRequiredFields(user);
    await user.click(getSubmitButton());

    await waitFor(() =>
      expect(
        screen.getByText(/fehler\. bitte versuch es später erneut/i),
      ).toBeInTheDocument(),
    );
    expect(getSubmitButton()).not.toBeDisabled();
  });

  it("shows the transient 'Wird gesendet…' state while the request is in flight", async () => {
    const user = userEvent.setup();
    let resolveFetch: (value: unknown) => void;
    (fetch as ReturnType<typeof vi.fn>).mockReturnValue(
      new Promise((resolve) => {
        resolveFetch = resolve;
      }),
    );

    await renderKontakt();
    await fillRequiredFields(user);
    await user.click(getSubmitButton());

    expect(getSubmitButton()).toHaveTextContent("Wird gesendet…");
    expect(getSubmitButton()).toBeDisabled();

    resolveFetch!({ ok: true, json: async () => ({ ok: true, saved: true }) });
    await waitFor(() =>
      expect(getSubmitButton()).toHaveTextContent("Gesendet"),
    );
  });
});
