import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

export const Route = createFileRoute("/test")({
  component: Test,
});

type VectorRecord = {
  namespace: string;
  id: string;
  data?: string;
  metadata?: Record<string, unknown>;
};

type VectorListing = {
  ok: true;
  endpoint: string;
  namespaces: string[];
  vectors: VectorRecord[];
  truncated: boolean;
};

async function fetchVectorListing(): Promise<VectorListing> {
  const res = await fetch("/api/vector/all");
  const body: unknown = await res.json().catch(() => null);
  if (!res.ok || !body || typeof body !== "object" || !("ok" in body)) {
    const error =
      body && typeof body === "object" && "error" in body
        ? String((body as { error: unknown }).error)
        : `request failed (${res.status})`;
    throw new Error(error);
  }
  return body as VectorListing;
}

function Test() {
  const { data, error, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["vector-listing"],
    queryFn: fetchVectorListing,
  });

  return (
    <div className="min-h-screen bg-background p-8 text-foreground">
      <header className="mb-8 flex flex-wrap items-baseline gap-x-4 gap-y-2">
        <h1 className="text-2xl font-semibold text-gradient">
          Vectoraiplattform
        </h1>
        <span className="text-sm text-muted-foreground">
          Upstash Vector — alle Datensätze
        </span>
        <button
          type="button"
          onClick={() => void refetch()}
          disabled={isFetching}
          className="ml-auto rounded-md border border-border px-3 py-1.5 text-sm disabled:opacity-50"
        >
          {isFetching ? "Lädt…" : "Neu laden"}
        </button>
      </header>

      {isLoading && <p className="text-muted-foreground">Lade Datensätze…</p>}

      {error && (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 p-4">
          Fehler: {error instanceof Error ? error.message : String(error)}
        </p>
      )}

      {data && (
        <>
          <dl className="mb-8 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[auto_1fr]">
            <dt className="text-muted-foreground">Index</dt>
            <dd className="font-mono">{data.endpoint}</dd>
            <dt className="text-muted-foreground">Namespaces</dt>
            <dd className="font-mono">
              {data.namespaces
                .map((ns) => (ns === "" ? "(default)" : ns))
                .join(", ") || "—"}
            </dd>
            <dt className="text-muted-foreground">Datensätze</dt>
            <dd className="font-mono">
              {data.vectors.length}
              {data.truncated && " (gekürzt)"}
            </dd>
          </dl>

          {data.vectors.length === 0 ? (
            <p className="text-muted-foreground">
              Der Index enthält noch keine Datensätze.
            </p>
          ) : (
            <ul className="space-y-4">
              {data.vectors.map((vector) => (
                <li
                  key={`${vector.namespace}/${vector.id}`}
                  className="glass rounded-lg p-4"
                >
                  <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="rounded bg-muted px-2 py-0.5 font-mono">
                      {vector.namespace === "" ? "(default)" : vector.namespace}
                    </span>
                    <span className="font-mono">{vector.id}</span>
                  </div>

                  {vector.data && (
                    <p className="mb-3 whitespace-pre-wrap break-words text-sm">
                      {vector.data}
                    </p>
                  )}

                  {vector.metadata && (
                    <pre className="overflow-x-auto rounded bg-muted/50 p-3 text-xs">
                      {JSON.stringify(vector.metadata, null, 2)}
                    </pre>
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
