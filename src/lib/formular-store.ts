import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

export const formularSubmissionSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  company: z.string().optional(),
  message: z.string().min(1),
});

export type FormularSubmission = z.infer<typeof formularSubmissionSchema> & {
  submittedAt: string;
};

const dataDir = path.resolve(process.cwd(), "data");
const dataFile = path.join(dataDir, "formular-submissions.json");

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
  await writeFile(dataFile, JSON.stringify(submissions, null, 2), "utf-8");

  return submission;
}
