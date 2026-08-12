import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

export const chatFeedbackSchema = z.object({
  messageId: z.number(),
  rating: z.enum(["up", "down"]),
  text: z.string().max(4000).optional(),
});

export type ChatFeedback = z.infer<typeof chatFeedbackSchema> & {
  loggedAt: string;
};

const dataDir = path.resolve(process.cwd(), "data");
const dataFile = path.join(dataDir, "chat-feedback.json");

// Same bounded-growth approach as src/lib/formular-store.ts — oldest-first
// eviction, since rate limiting already throttles the abuse path.
const MAX_ENTRIES = 5000;
const MAX_FILE_BYTES = 5 * 1024 * 1024;

export async function saveChatFeedback(input: unknown): Promise<ChatFeedback> {
  const data = chatFeedbackSchema.parse(input);

  await mkdir(dataDir, { recursive: true });

  let entries: ChatFeedback[] = [];
  try {
    const raw: unknown = JSON.parse(await readFile(dataFile, "utf-8"));
    if (Array.isArray(raw)) entries = raw as ChatFeedback[];
  } catch {
    entries = [];
  }

  const entry: ChatFeedback = { ...data, loggedAt: new Date().toISOString() };
  entries.push(entry);

  while (entries.length > MAX_ENTRIES) entries.shift();

  let serialized = JSON.stringify(entries, null, 2);
  while (
    Buffer.byteLength(serialized, "utf-8") > MAX_FILE_BYTES &&
    entries.length > 1
  ) {
    entries.shift();
    serialized = JSON.stringify(entries, null, 2);
  }

  await writeFile(dataFile, serialized, "utf-8");

  return entry;
}
