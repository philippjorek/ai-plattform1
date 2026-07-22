import { useEffect, useRef, useState, type FormEvent } from "react";
import { MessageCircle, Send, ThumbsDown, ThumbsUp, X } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

type ChatMessage = {
  id: number;
  role: "bot" | "user";
  text: string;
};

const GREETING =
  "Hi, ich bin Philipp, dein Assistent, wenn es um KI Themen geht. Frag mich etwas zu Projekten oder Softskills oder kontaktiere Philipp Jorek direkt.";

const FALLBACK_ANSWER =
  "Der Chat ist gerade nicht erreichbar. Schreib mir gern direkt über die Kontaktseite, dann meldet sich Philipp persönlich.";

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 0, role: "bot", text: GREETING },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<Record<number, "up" | "down">>({});
  const nextId = useRef(1);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, open, sending]);

  const sendFeedback = (
    messageId: number,
    rating: "up" | "down",
    text: string,
  ) => {
    setFeedback((prev) => ({ ...prev, [messageId]: rating }));
    void fetch("/api/chat-feedback", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ messageId, rating, text }),
    }).catch(() => {});
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;

    const history = [
      ...messages,
      { id: nextId.current++, role: "user" as const, text },
    ];
    setMessages(history);
    setInput("");
    setSending(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          messages: history.map((m) => ({
            role: m.role === "bot" ? "assistant" : "user",
            content: m.text,
          })),
        }),
      });
      if (!res.ok) throw new Error("chat request failed");
      const data: { ok: boolean; reply?: string } = await res.json();
      if (!data.ok || !data.reply) throw new Error("chat request failed");

      setMessages((prev) => [
        ...prev,
        { id: nextId.current++, role: "bot", text: data.reply! },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: nextId.current++, role: "bot", text: FALLBACK_ANSWER },
      ]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[60] flex flex-col items-end gap-3">
      {open && (
        <div className="glass glow-ring flex h-[28rem] w-[22rem] max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-xl">
          <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
            <div>
              <p className="font-display text-sm font-semibold">
                Chat-Assistent
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Chat schließen"
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div
            ref={scrollRef}
            className="flex-1 space-y-3 overflow-y-auto px-4 py-4"
          >
            {messages.map((m) => (
              <div
                key={m.id}
                className={cn(
                  "flex flex-col",
                  m.role === "user" ? "items-end" : "items-start",
                )}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap",
                    m.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-card text-card-foreground border border-border/60",
                  )}
                >
                  {m.text}
                </div>
                {m.role === "bot" && (
                  <div className="mt-1 flex gap-1 pl-1">
                    <button
                      type="button"
                      onClick={() => sendFeedback(m.id, "up", m.text)}
                      aria-label="Antwort hilfreich"
                      aria-pressed={feedback[m.id] === "up"}
                      className={cn(
                        "rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
                        feedback[m.id] === "up" && "text-primary",
                      )}
                    >
                      <ThumbsUp
                        className="h-3.5 w-3.5"
                        fill={feedback[m.id] === "up" ? "currentColor" : "none"}
                      />
                    </button>
                    <button
                      type="button"
                      onClick={() => sendFeedback(m.id, "down", m.text)}
                      aria-label="Antwort nicht hilfreich"
                      aria-pressed={feedback[m.id] === "down"}
                      className={cn(
                        "rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
                        feedback[m.id] === "down" && "text-primary",
                      )}
                    >
                      <ThumbsDown
                        className="h-3.5 w-3.5"
                        fill={
                          feedback[m.id] === "down" ? "currentColor" : "none"
                        }
                      />
                    </button>
                  </div>
                )}
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="max-w-[85%] rounded-lg border border-border/60 bg-card px-3 py-2 text-sm text-muted-foreground">
                  …
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-border/60 px-3 py-2 text-center">
            <Link
              to="/kontakt"
              onClick={() => setOpen(false)}
              className="text-xs text-primary underline-offset-4 hover:underline"
            >
              Lieber direkt Kontakt aufnehmen →
            </Link>
          </div>

          <form
            onSubmit={handleSubmit}
            className="flex items-center gap-2 border-t border-border/60 p-3"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Nachricht schreiben…"
              aria-label="Nachricht"
              disabled={sending}
              className="h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
            />
            <button
              type="submit"
              aria-label="Senden"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              disabled={!input.trim() || sending}
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Chat schließen" : "Chat öffnen"}
        className="glow-ring flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-primary-foreground transition-transform hover:scale-105"
      >
        {open ? (
          <X className="h-6 w-6" />
        ) : (
          <MessageCircle className="h-6 w-6" />
        )}
      </button>
    </div>
  );
}
