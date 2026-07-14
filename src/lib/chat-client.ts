import { z } from "zod";

const chatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(4000),
});

export const chatRequestSchema = z.object({
  messages: z.array(chatMessageSchema).min(1).max(40),
});

const SYSTEM_PROMPT =
  'Du bist der virtuelle Assistent auf der Portfolio-Website "Service-mit-Herz" von Philipp, ' +
  "einem AI Architekten und Software-Engineer. Antworte kurz, freundlich und auf Deutsch. " +
  "Hilf Besuchern, sich über Leistungen, Projekte und technische Architektur zu orientieren. " +
  "Bei konkreten Anfragen (Angebote, Zusammenarbeit) verweise auf die Kontaktseite (/kontakt) " +
  "oder jorek@impli.de. Wenn du etwas nicht weißt, sag das ehrlich statt zu spekulieren.";

export type ChatEnv = {
  baseUrl: string;
  apiKey: string;
  model: string;
};

export function readChatEnv(): ChatEnv | null {
  const baseUrl = process.env.OPEN_WEBUI_URL;
  const apiKey = process.env.OPEN_WEBUI_API_KEY;
  const model = process.env.OPEN_WEBUI_MODEL;
  if (!baseUrl || !apiKey || !model) return null;
  return { baseUrl, apiKey, model };
}

export async function getChatReply(
  input: unknown,
  env: ChatEnv,
): Promise<string> {
  const { messages } = chatRequestSchema.parse(input);

  const res = await fetch(`${env.baseUrl}/api/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${env.apiKey}`,
    },
    body: JSON.stringify({
      model: env.model,
      messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
    }),
  });

  if (!res.ok) {
    throw new Error(`open-webui request failed: ${res.status}`);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const reply = data.choices?.[0]?.message?.content?.trim();
  if (!reply) throw new Error("open-webui returned no content");
  return reply;
}
