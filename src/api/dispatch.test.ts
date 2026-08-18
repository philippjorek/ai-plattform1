import type {
  IncomingHttpHeaders,
  IncomingMessage,
  ServerResponse,
} from "node:http";
import { Readable } from "node:stream";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getChatReply, readChatEnv } from "../lib/chat-client.ts";
import { saveChatFeedback } from "../lib/chat-feedback-store.ts";
import { saveFormularSubmission } from "../lib/formular-store.ts";
import type { VectorListing } from "../lib/vector-store.ts";
import {
  fetchVector,
  isVectorConfigured,
  listAllVectors,
} from "../lib/vector-store.ts";
import { apiRoutes } from "./index.ts";
import { createApiMiddleware } from "./dispatch.ts";

vi.mock("../lib/formular-store.ts", () => ({
  saveFormularSubmission: vi.fn(),
}));
vi.mock("../lib/chat-feedback-store.ts", () => ({ saveChatFeedback: vi.fn() }));
vi.mock("../lib/chat-client.ts", () => ({
  readChatEnv: vi.fn(),
  getChatReply: vi.fn(),
}));
vi.mock("../lib/vector-store.ts", () => ({
  listAllVectors: vi.fn(),
  fetchVector: vi.fn(),
  isVectorConfigured: vi.fn(),
}));

const middleware = createApiMiddleware(apiRoutes);

// The rate limiter keeps per-IP state in module scope for the whole test run,
// so every request gets a fresh IP unless a test deliberately reuses one.
let ipCounter = 0;
const freshIp = () => `10.0.0.${++ipCounter}`;

const listing: VectorListing = {
  endpoint: "https://example.upstash.io",
  namespaces: [""],
  vectors: [{ namespace: "", id: "1", data: "hallo" }],
  truncated: false,
};

function makeReq({
  url,
  method,
  body,
  ip = freshIp(),
}: {
  url: string;
  method: string;
  body?: string;
  ip?: string;
}): IncomingMessage {
  const chunks = body === undefined ? [] : [Buffer.from(body)];
  return Object.assign(Readable.from(chunks), {
    url,
    method,
    headers: {} as IncomingHttpHeaders,
    socket: { remoteAddress: ip },
  }) as unknown as IncomingMessage;
}

function makeRes() {
  const headers: Record<string, string> = {};
  const captured = { statusCode: 0, headers, body: "" };
  const res = {
    get statusCode() {
      return captured.statusCode;
    },
    set statusCode(value: number) {
      captured.statusCode = value;
    },
    setHeader(name: string, value: string | number) {
      headers[name.toLowerCase()] = String(value);
    },
    end(chunk?: string) {
      captured.body = chunk ?? "";
    },
  };
  return { res: res as unknown as ServerResponse, captured };
}

async function call(req: IncomingMessage) {
  const { res, captured } = makeRes();
  const next = vi.fn();
  await middleware(req, res, next);
  return {
    next,
    status: captured.statusCode,
    headers: captured.headers,
    json: captured.body === "" ? undefined : JSON.parse(captured.body),
  };
}

beforeEach(() => {
  vi.mocked(saveFormularSubmission).mockReset();
  vi.mocked(saveChatFeedback).mockReset();
  vi.mocked(readChatEnv).mockReset();
  vi.mocked(getChatReply).mockReset();
  vi.mocked(listAllVectors).mockReset();
  vi.mocked(fetchVector).mockReset();
  // Configured unless a test says otherwise.
  vi.mocked(isVectorConfigured).mockReturnValue(true);
});

describe("createApiMiddleware routing", () => {
  it("passes unknown paths through to the next handler", async () => {
    const result = await call(makeReq({ url: "/nope", method: "POST" }));
    expect(result.next).toHaveBeenCalledOnce();
    expect(result.status).toBe(0);
  });

  it("passes a known path with the wrong method through", async () => {
    const result = await call(makeReq({ url: "/api/formular", method: "GET" }));
    expect(result.next).toHaveBeenCalledOnce();
  });

  it("answers OPTIONS preflight with 204 and CORS headers", async () => {
    const result = await call(
      makeReq({ url: "/api/formular", method: "OPTIONS" }),
    );
    expect(result.status).toBe(204);
    expect(result.headers["access-control-allow-origin"]).toBeTruthy();
    expect(result.headers["access-control-allow-methods"]).toBe(
      "POST, OPTIONS",
    );
    expect(result.next).not.toHaveBeenCalled();
  });

  it("ignores the query string when matching", async () => {
    vi.mocked(listAllVectors).mockResolvedValue(listing);
    const result = await call(
      makeReq({ url: "/api/vector/all?refresh=1", method: "GET" }),
    );
    expect(result.status).toBe(200);
    expect(result.json).toEqual({ ok: true, ...listing });
  });

  it("sets CORS headers on a served route", async () => {
    const result = await call(
      makeReq({ url: "/api/formular", method: "POST", body: "{}" }),
    );
    expect(result.headers["access-control-allow-origin"]).toBeTruthy();
    expect(result.headers["content-type"]).toBe("application/json");
  });
});

describe("formular route", () => {
  it("saves a submission and answers 200", async () => {
    const result = await call(
      makeReq({
        url: "/api/formular",
        method: "POST",
        body: JSON.stringify({ name: "Ada" }),
      }),
    );
    expect(saveFormularSubmission).toHaveBeenCalledWith({ name: "Ada" });
    expect(result.status).toBe(200);
    expect(result.json).toEqual({ ok: true, saved: true });
  });

  it("answers 400 on malformed JSON", async () => {
    const result = await call(
      makeReq({ url: "/api/formular", method: "POST", body: "{not json" }),
    );
    expect(saveFormularSubmission).not.toHaveBeenCalled();
    expect(result.status).toBe(400);
    expect(result.json).toEqual({ ok: false, saved: false });
  });

  it("answers 400 when the store rejects", async () => {
    vi.mocked(saveFormularSubmission).mockRejectedValue(new Error("invalid"));
    const result = await call(
      makeReq({ url: "/api/formular", method: "POST", body: "{}" }),
    );
    expect(result.status).toBe(400);
  });

  it("answers 413 for an oversized body without parsing it", async () => {
    const result = await call(
      makeReq({
        url: "/api/formular",
        method: "POST",
        body: JSON.stringify({ name: "x".repeat(21 * 1024) }),
      }),
    );
    expect(saveFormularSubmission).not.toHaveBeenCalled();
    expect(result.status).toBe(413);
  });

  it("answers 429 with retry-after once the per-IP limit is exceeded", async () => {
    const ip = freshIp();
    const send = () =>
      call(makeReq({ url: "/api/formular", method: "POST", body: "{}", ip }));

    for (let i = 0; i < 5; i++) {
      expect((await send()).status).toBe(200);
    }
    const blocked = await send();
    expect(blocked.status).toBe(429);
    expect(Number(blocked.headers["retry-after"])).toBeGreaterThan(0);
    expect(blocked.json).toEqual({ ok: false, error: "too many requests" });
  });
});

describe("chat route", () => {
  const env = { baseUrl: "http://webui", apiKey: "k", model: "m" };

  it("proxies the reply when configured", async () => {
    vi.mocked(readChatEnv).mockReturnValue(env);
    vi.mocked(getChatReply).mockResolvedValue("hallo");
    const result = await call(
      makeReq({
        url: "/api/chat",
        method: "POST",
        body: JSON.stringify({ messages: [] }),
      }),
    );
    expect(result.status).toBe(200);
    expect(result.json).toEqual({ ok: true, reply: "hallo" });
  });

  it("answers 503 when the backend is unconfigured, without spending rate-limit budget", async () => {
    const ip = freshIp();
    vi.mocked(readChatEnv).mockReturnValue(null);
    const send = () =>
      call(makeReq({ url: "/api/chat", method: "POST", body: "{}", ip }));

    // More attempts than the route's max of 20.
    for (let i = 0; i < 25; i++) {
      expect((await send()).status).toBe(503);
    }

    vi.mocked(readChatEnv).mockReturnValue(env);
    vi.mocked(getChatReply).mockResolvedValue("hallo");
    expect((await send()).status).toBe(200);
  });

  it("answers 400 when the upstream call fails", async () => {
    vi.mocked(readChatEnv).mockReturnValue(env);
    vi.mocked(getChatReply).mockRejectedValue(new Error("upstream down"));
    const result = await call(
      makeReq({ url: "/api/chat", method: "POST", body: "{}" }),
    );
    expect(result.status).toBe(400);
    expect(result.json).toEqual({ ok: false, error: "chat request failed" });
  });
});

describe("chat-feedback route", () => {
  it("stores feedback and answers 200", async () => {
    const result = await call(
      makeReq({
        url: "/api/chat-feedback",
        method: "POST",
        body: JSON.stringify({ rating: "up" }),
      }),
    );
    expect(saveChatFeedback).toHaveBeenCalledWith({ rating: "up" });
    expect(result.status).toBe(200);
    expect(result.json).toEqual({ ok: true });
  });

  it("answers 400 when the store rejects", async () => {
    vi.mocked(saveChatFeedback).mockRejectedValue(new Error("invalid"));
    const result = await call(
      makeReq({ url: "/api/chat-feedback", method: "POST", body: "{}" }),
    );
    expect(result.status).toBe(400);
    expect(result.json).toEqual({ ok: false });
  });
});

describe("vector route", () => {
  it("answers 503 when the index is not configured", async () => {
    vi.mocked(listAllVectors).mockResolvedValue(null);
    const result = await call(
      makeReq({ url: "/api/vector/all", method: "GET" }),
    );
    expect(result.status).toBe(503);
    expect(result.json).toEqual({
      ok: false,
      error: "vector backend not configured",
    });
  });

  it("answers 502 when the upstream call throws", async () => {
    vi.mocked(listAllVectors).mockRejectedValue(new Error("upstash down"));
    const result = await call(
      makeReq({ url: "/api/vector/all", method: "GET" }),
    );
    expect(result.status).toBe(502);
    expect(result.json).toEqual({ ok: false, error: "vector request failed" });
  });

  it("answers 503 before spending rate-limit budget when unconfigured", async () => {
    const ip = freshIp();
    vi.mocked(isVectorConfigured).mockReturnValue(false);
    const send = () =>
      call(makeReq({ url: "/api/vector/all", method: "GET", ip }));

    // More attempts than the route's max of 30.
    for (let i = 0; i < 35; i++) {
      expect((await send()).status).toBe(503);
    }
    expect(listAllVectors).not.toHaveBeenCalled();

    vi.mocked(isVectorConfigured).mockReturnValue(true);
    vi.mocked(listAllVectors).mockResolvedValue(listing);
    expect((await send()).status).toBe(200);
  });
});

describe("vector fetch route", () => {
  it("returns the record for an id", async () => {
    vi.mocked(fetchVector).mockResolvedValue({ record: { id: "1" } });
    const result = await call(
      makeReq({ url: "/api/vector?id=1", method: "GET" }),
    );
    expect(fetchVector).toHaveBeenCalledWith("1");
    expect(result.status).toBe(200);
    expect(result.json).toEqual({ ok: true, result: { id: "1" } });
  });

  it("returns a null result for an unknown id", async () => {
    vi.mocked(fetchVector).mockResolvedValue({ record: null });
    const result = await call(
      makeReq({ url: "/api/vector?id=nope", method: "GET" }),
    );
    expect(result.status).toBe(200);
    expect(result.json).toEqual({ ok: true, result: null });
  });

  it("answers 400 when id is missing, without calling the backend", async () => {
    const result = await call(makeReq({ url: "/api/vector", method: "GET" }));
    expect(fetchVector).not.toHaveBeenCalled();
    expect(result.status).toBe(400);
    expect(result.json).toEqual({ ok: false, error: "missing id" });
  });

  it("answers 503 when unconfigured", async () => {
    vi.mocked(isVectorConfigured).mockReturnValue(false);
    const result = await call(
      makeReq({ url: "/api/vector?id=1", method: "GET" }),
    );
    expect(result.status).toBe(503);
    expect(result.json).toEqual({
      ok: false,
      error: "vector backend not configured",
    });
  });

  it("answers 502 when the upstream call throws", async () => {
    vi.mocked(fetchVector).mockRejectedValue(new Error("upstash down"));
    const result = await call(
      makeReq({ url: "/api/vector?id=1", method: "GET" }),
    );
    expect(result.status).toBe(502);
    expect(result.json).toEqual({ ok: false, error: "vector request failed" });
  });
});
