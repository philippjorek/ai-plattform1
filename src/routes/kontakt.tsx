import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import heroImage from "@/assets/hero-contact.jpg";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { ParallaxHero } from "@/components/ParallaxHero";
import { Reveal } from "@/components/Reveal";

export const Route = createFileRoute("/kontakt")({
  head: () => ({
    meta: [
      { title: "Kontakt — Service-mit-Herz" },
      { name: "description", content: "Lass uns über dein KI-Projekt sprechen. Direkt, ehrlich, technisch fundiert." },
      { property: "og:title", content: "Kontakt — Service-mit-Herz" },
      { property: "og:description", content: "Schreib mir über dein KI-Projekt." },
    ],
  }),
  component: ContactPage,
});

const channels = [
  { label: "Email", value: "hello@service-mit-herz.ai" },
  { label: "GitHub", value: "github.com/service-mit-herz" },
  { label: "LinkedIn", value: "linkedin.com/in/service-mit-herz" },
];

function ContactPage() {
  const [sent, setSent] = useState(false);

  return (
    <main className="relative">
      <SiteNav />

      <ParallaxHero
        image={heroImage}
        eyebrow="Get in touch"
        title={
          <>
            Sag <span className="text-gradient">Hallo</span>.
          </>
        }
        subtitle="Eine kurze Nachricht reicht. Ich melde mich innerhalb von 24 Stunden zurück."
      />

      <section className="relative py-32 px-6">
        <div className="mx-auto max-w-5xl grid md:grid-cols-[1fr_320px] gap-12">
          <Reveal>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setSent(true);
              }}
              className="glass rounded-2xl p-8 md:p-10 space-y-6"
            >
              <div className="grid md:grid-cols-2 gap-6">
                <Field label="Name" name="name" />
                <Field label="Email" name="email" type="email" />
              </div>
              <Field label="Unternehmen" name="company" />
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Worum geht's?
                </label>
                <textarea
                  required
                  rows={6}
                  className="mt-2 w-full bg-transparent border-0 border-b border-border focus:border-primary outline-none py-3 text-foreground placeholder:text-muted-foreground transition-colors resize-none"
                  placeholder="Erzähl mir kurz von deinem Vorhaben..."
                />
              </div>

              <button
                type="submit"
                className="group relative w-full md:w-auto px-10 py-4 rounded-full bg-gradient-to-r from-primary to-accent text-primary-foreground font-medium overflow-hidden glow-ring"
                disabled={sent}
              >
                <span className="relative z-10">
                  {sent ? "✓ Gesendet — danke!" : "Nachricht senden"}
                </span>
              </button>
            </form>
          </Reveal>

          <Reveal delay={150}>
            <div className="space-y-8">
              <div>
                <div className="text-xs uppercase tracking-[0.3em] text-primary mb-4">
                  Direkt
                </div>
                <div className="space-y-4">
                  {channels.map((c) => (
                    <div key={c.label} className="border-b border-border pb-3">
                      <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                        {c.label}
                      </div>
                      <div className="font-mono text-sm mt-1 break-all">{c.value}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="glass rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-2">
                  <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse-glow" />
                  <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Verfügbar
                  </span>
                </div>
                <p className="text-sm text-foreground/80">
                  Aktuell offen für neue KI-Projekte ab Q3 2026.
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}

function Field({
  label,
  name,
  type = "text",
}: {
  label: string;
  name: string;
  type?: string;
}) {
  return (
    <div>
      <label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </label>
      <input
        required
        name={name}
        type={type}
        className="mt-2 w-full bg-transparent border-0 border-b border-border focus:border-primary outline-none py-3 text-foreground transition-colors"
      />
    </div>
  );
}
