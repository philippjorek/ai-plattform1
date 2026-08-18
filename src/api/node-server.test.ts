import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createApiServer } from "./node-server.ts";
import type { ApiRoute } from "./route.ts";

const echoRoute: ApiRoute = {
  name: "test-echo",
  path: "/api/echo",
  method: "POST",
  rateLimit: { windowMs: 60_000, max: 1000 },
  maxBodyBytes: 1024,
  handle: async ({ body }) => ({ status: 200, body: { ok: true, echo: body } }),
  onError: () => ({ status: 400, body: { ok: false } }),
};

const server = createApiServer([echoRoute]);
let base = "";

beforeAll(async () => {
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) =>
    server.close((err) => (err ? reject(err) : resolve())),
  );
});

describe("createApiServer", () => {
  it("serves a route from the shared table", async () => {
    const res = await fetch(`${base}/api/echo`, {
      method: "POST",
      body: JSON.stringify({ hi: "there" }),
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, echo: { hi: "there" } });
    expect(res.headers.get("access-control-allow-origin")).toBeTruthy();
  });

  it("answers 404 JSON for a path it does not own", async () => {
    const res = await fetch(`${base}/api/chat`, { method: "POST" });
    expect(res.status).toBe(404);
    expect(res.headers.get("content-type")).toBe("application/json");
    expect(res.headers.get("access-control-allow-origin")).toBeTruthy();
    expect(await res.json()).toEqual({ ok: false });
  });

  it("answers 404 JSON for a known path with the wrong method", async () => {
    const res = await fetch(`${base}/api/echo`);
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ ok: false });
  });

  it("handles preflight", async () => {
    const res = await fetch(`${base}/api/echo`, { method: "OPTIONS" });
    expect(res.status).toBe(204);
    expect(res.headers.get("access-control-allow-methods")).toBe(
      "POST, OPTIONS",
    );
  });
});
