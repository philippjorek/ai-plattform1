import { createFileRoute } from "@tanstack/react-router";
import heroImage from "@/assets/hero-architecture.jpg";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { ParallaxHero } from "@/components/ParallaxHero";
import { Reveal } from "@/components/Reveal";

export const Route = createFileRoute("/architecture")({
  head: () => ({
    meta: [
      { title: "Architecture — Service-mit-Herz" },
      { name: "description", content: "Wie ich KI- und Softwarearchitekturen entwerfe: Prinzipien, Layer und Patterns." },
      { property: "og:title", content: "AI Architecture — Service-mit-Herz" },
      { property: "og:description", content: "Prinzipien moderner KI-Architektur." },
    ],
  }),
  component: ArchitecturePage,
});

const layers = [
  {
    n: "01",
    title: "Foundation Layer",
    desc: "Vector Stores, Embedding-Pipelines und Daten-Infrastruktur — das Fundament jedes intelligenten Systems.",
    tech: ["Postgres + pgvector", "Qdrant", "Apache Kafka"],
  },
  {
    n: "02",
    title: "Model Layer",
    desc: "LLMs, Fine-Tuned Modelle und spezialisierte Klassifikatoren — orchestriert und versioniert.",
    tech: ["OpenAI / Anthropic", "Llama 3", "HuggingFace"],
  },
  {
    n: "03",
    title: "Orchestration Layer",
    desc: "Agenten, Tool-Calling und Routing-Logik — der Dirigent zwischen Mensch, Daten und Modellen.",
    tech: ["LangGraph", "LlamaIndex", "Custom Runtime"],
  },
  {
    n: "04",
    title: "Experience Layer",
    desc: "Schnelle, type-safe Interfaces — Streaming UIs, Realtime-Feedback, Edge-Deployments.",
    tech: ["TanStack Start", "Edge Functions", "WebSockets"],
  },
];

const principles = [
  "Daten sind Architektur — alles fließt aus dem Modell der Realität.",
  "Type-Safety vom Edge bis zur Datenbank.",
  "Observability ist kein Add-on, sondern eine Designentscheidung.",
  "Modelle sind austauschbar — Workflows sind es nicht.",
];

function ArchitecturePage() {
  return (
    <main className="relative">
      <SiteNav />

      <ParallaxHero
        image={heroImage}
        eyebrow="AI Architecture"
        title={
          <>
            Systeme, die <span className="text-gradient">verstehen</span>.
          </>
        }
        subtitle="Vier Layer, ein durchgängiger Datenfluss — von Embeddings bis Edge-Streaming."
      />

      {/* Layer stack */}
      <section className="relative py-32 px-6">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <div className="mb-20">
              <div className="text-xs uppercase tracking-[0.3em] text-primary mb-4">
                Der Stack
              </div>
              <h2 className="text-4xl md:text-6xl font-bold">
                Vier Layer, <span className="text-gradient">ein Organismus</span>.
              </h2>
            </div>
          </Reveal>

          <div className="space-y-6">
            {layers.map((l, i) => (
              <Reveal key={l.n} delay={i * 100}>
                <div className="group grid md:grid-cols-[120px_1fr_auto] gap-6 md:gap-10 p-8 rounded-2xl glass hover:glow-ring transition-all duration-500">
                  <div className="text-5xl font-display font-bold text-gradient">{l.n}</div>
                  <div>
                    <h3 className="text-2xl font-semibold mb-2">{l.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">{l.desc}</p>
                  </div>
                  <div className="flex flex-wrap md:flex-col gap-2 md:items-end">
                    {l.tech.map((t) => (
                      <span
                        key={t}
                        className="text-xs font-mono px-3 py-1 rounded-full bg-secondary border border-border"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Principles */}
      <section className="relative py-32 px-6">
        <div className="mx-auto max-w-5xl">
          <Reveal>
            <h2 className="text-4xl md:text-5xl font-bold mb-16">
              Prinzipien
            </h2>
          </Reveal>
          <div className="grid md:grid-cols-2 gap-px bg-border rounded-2xl overflow-hidden">
            {principles.map((p, i) => (
              <Reveal key={p} delay={i * 80}>
                <div className="p-10 bg-background/40 h-full flex gap-4">
                  <div className="text-primary font-mono text-sm shrink-0">→</div>
                  <p className="text-lg leading-relaxed">{p}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
