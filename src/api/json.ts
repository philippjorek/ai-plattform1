// Every API route answers with JSON; this is the one place that writes it.

export type JsonResponse = {
  status: number;
  body: unknown;
  headers?: Record<string, string>;
};

export function sendJson(
  res: import("node:http").ServerResponse,
  { status, body, headers }: JsonResponse,
) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json");
  for (const [name, value] of Object.entries(headers ?? {})) {
    res.setHeader(name, value);
  }
  res.end(JSON.stringify(body));
}
