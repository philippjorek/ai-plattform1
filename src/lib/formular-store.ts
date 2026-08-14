import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { vectordatabasetest } from "./vector-store";

export const formularSubmissionSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().max(320),
  company: z.string().max(200).optional(),
  message: z.string().min(1).max(5000),
});

export type FormularSubmission = z.infer<typeof formularSubmissionSchema> & {
  submittedAt: string;
};

const dataDir = path.resolve(process.cwd(), "data");
const dataFile = path.join(dataDir, "formular-submissions.json");

// Bounds on-disk growth of the append-only submissions file. Eviction is
// oldest-first (not reject-new-writes) so a burst of abuse can't also block
// a genuine visitor's submission — rate limiting is what throttles the
// abuse path that would trigger eviction in the first place.
const MAX_ENTRIES = 5000;
const MAX_FILE_BYTES = 5 * 1024 * 1024;

export async function saveFormularSubmission(
  input: unknown,
): Promise<FormularSubmission> {
  const data = formularSubmissionSchema.parse(input);

  await mkdir(dataDir, { recursive: true });

  let submissions: FormularSubmission[] = [];
  try {
    const raw: unknown = JSON.parse(await readFile(dataFile, "utf-8"));
    if (Array.isArray(raw)) submissions = raw as FormularSubmission[];
  } catch {
    submissions = [];
  }

  const submission: FormularSubmission = {
    ...data,
    submittedAt: new Date().toISOString(),
  };
  submissions.push(submission);

  while (submissions.length > MAX_ENTRIES) submissions.shift();

  let serialized = JSON.stringify(submissions, null, 2);
  while (
    Buffer.byteLength(serialized, "utf-8") > MAX_FILE_BYTES &&
    submissions.length > 1
  ) {
    submissions.shift();
    serialized = JSON.stringify(submissions, null, 2);
  }

  await writeFile(dataFile, serialized, "utf-8");

  // Additionally mirror into the "Vectoraiplattform" vector index. Best
  // effort: vectordatabasetest() swallows its own errors, so a missing/down
  // vector backend never breaks the JSON-backed Kontakt submission flow.
  await vectordatabasetest(submission);

  return submission;
}
