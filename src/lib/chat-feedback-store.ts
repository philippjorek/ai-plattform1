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
  await writeFile(dataFile, JSON.stringify(entries, null, 2), "utf-8");

  return entry;
}
