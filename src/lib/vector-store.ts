import { Index } from "@upstash/vector";
import type { FormularSubmission } from "./formular-store";

// Vector indexes have no "create table" step — a namespace is created
// implicitly on first upsert. This keeps Kontakt submissions logically
// separated within the single "Vectoraiplattform" index (AIPLATTFOR-5).
const NAMESPACE = "kontakt";

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
