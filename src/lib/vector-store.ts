import { Index } from "@upstash/vector";
import type { FormularSubmission } from "./formular-store.ts";

// Vector indexes have no "create table" step — a namespace is created
// implicitly on first upsert. This keeps Kontakt submissions logically
// separated within the single "Vectoraiplattform" index (AIPLATTFOR-5).
const NAMESPACE = "kontakt";

// Whether the vector backend is configured at all. Lets a route answer 503
// before spending the caller's rate-limit budget.
export function isVectorConfigured(): boolean {
  return readVectorEnv() !== null;
}

function readVectorEnv() {
  const url = process.env.aiplattform2_UPSTASH_VECTOR_REST_URL;
  const token = process.env.aiplattform2_UPSTASH_VECTOR_REST_TOKEN;
  if (!url || !token) return null;
  return { url, token };
}

let cachedIndex: Index | null = null;
function getIndex(env: { url: string; token: string }) {
  if (!cachedIndex) {
    cachedIndex = new Index({ url: env.url, token: env.token });
  }
  return cachedIndex;
}

// Best-effort mirror of saveFormularSubmission's JSON write into the
// "Vectoraiplattform" vector index — additive, not a replacement. The JSON
// file in data/ stays the source of truth; a failure or missing vector
// backend here must not break the Kontakt form response.
export async function vectordatabasetest(
  submission: FormularSubmission,
): Promise<boolean> {
  const env = readVectorEnv();
  if (!env) return false;

  const id = `formular-${submission.submittedAt}`;
  const data = [
    submission.name,
    submission.company,
    submission.email,
    submission.message,
  ]
    .filter(Boolean)
    .join(" — ");

  try {
    const index = getIndex(env);
    await index.upsert(
      { id, data, metadata: { ...submission } },
      { namespace: NAMESPACE },
    );
    return true;
  } catch {
    return false;
  }
}

export type VectorRecord = {
  namespace: string;
  id: string;
  data?: string;
  metadata?: Record<string, unknown>;
};

export type VectorListing = {
  endpoint: string;
  namespaces: string[];
  vectors: VectorRecord[];
  truncated: boolean;
};

// `range` is cursor-paginated; these bound a single listing request so a
// large index can't stall the page or blow up the JSON response. Vectors
// themselves are never included — only id/data/metadata, which is what the
// /test inspector actually renders.
const RANGE_PAGE_SIZE = 100;
const MAX_VECTORS = 500;

// Reads every record out of the "Vectoraiplattform" index across all of its
// namespaces (the unnamed default namespace is listed as ""). Returns null
// when the vector backend isn't configured, so callers can answer 503 rather
// than surfacing a crash.
export async function listAllVectors(): Promise<VectorListing | null> {
  const env = readVectorEnv();
  if (!env) return null;

  const index = getIndex(env);
  const namespaces = await index.listNamespaces();

  const vectors: VectorRecord[] = [];
  let truncated = false;

  for (const namespace of namespaces) {
    let cursor: string | number = "";
    do {
      // Annotated because `cursor` is reassigned from `page.nextCursor`,
      // which makes the inferred type of `page` self-referential (TS7022).
      const page: Awaited<ReturnType<typeof index.range>> = await index.range(
        {
          cursor,
          limit: RANGE_PAGE_SIZE,
          includeMetadata: true,
          includeData: true,
          includeVectors: false,
        },
        { namespace },
      );

      for (const vector of page.vectors) {
        vectors.push({
          namespace,
          id: String(vector.id),
          data: vector.data,
          metadata: vector.metadata as Record<string, unknown> | undefined,
        });
      }

      cursor = page.nextCursor;
    } while (cursor && vectors.length < MAX_VECTORS);

    if (vectors.length >= MAX_VECTORS) {
      truncated = true;
      break;
    }
  }

  return {
    endpoint: new URL(env.url).host,
    namespaces,
    vectors,
    truncated,
  };
}

// Single-record lookup by id, backing GET /api/vector?id=... Returns null
// when the vector backend isn't configured, so callers can answer 503;
// a configured-but-unknown id resolves to { record: null }.
export async function fetchVector(
  id: string,
): Promise<{ record: unknown } | null> {
  const env = readVectorEnv();
  if (!env) return null;

  const result = await getIndex(env).fetch([id], { includeData: true });
  return { record: result[0] ?? null };
}
