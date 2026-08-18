// Bounded request-body reading for the dev/preview API routes, mirroring the
// same guard in server/formular-server.mjs and server/chat-server.mjs —
// rejects before JSON.parse ever runs on an oversized body, independent of
// the entry-count cap on the JSON stores.

export class BodyTooLargeError extends Error {}

export function readBoundedBody(
  req: import("node:http").IncomingMessage,
  maxBytes: number,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let total = 0;
    req.on("data", (chunk: Buffer) => {
      total += chunk.length;
      if (total > maxBytes) {
        req.destroy();
        reject(new BodyTooLargeError());
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
    req.on("error", reject);
  });
}

// Shared status mapping for the "read body, parse it, hand it to a store"
// routes: an oversized body is 413, anything else (bad JSON, store failure)
// is 400.
export function bodyErrorStatus(err: unknown): number {
  return err instanceof BodyTooLargeError ? 413 : 400;
}
