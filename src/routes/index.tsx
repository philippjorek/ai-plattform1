import { createFileRoute, Link } from "@tanstack/react-router";
import heroImage from "@/assets/hero-home.jpg";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { ParallaxHero } from "@/components/ParallaxHero";
import { Reveal } from "@/components/Reveal";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Agentic &amp; Generative AI Engineering - by Philipp Jorek" },
      { name: "description", content: "Ai Solutions for IT-Projects from Kassel to the world." },
      { property: "og:title", content: "AI Architecture" },
      { property: "og:description", content: "AI Software-Architecture und Development." },
    ],
  }),
  component: HomePage,
});

const stats = [
  { value: "16+", label: "Jahre Development" },
  { value: "40+", label: "IT-Projekte" },
  { value: "12+", label: "Agents" },
  { value: "∞", label: "Lernkurve" },
];

const capabilities = [
  {
    title: "LLM Architektur",
    desc: "Retrieval-Augmented Generation (RAG), Agenten-Frameworks und Fine-Tuning fuer produktionsreife Modelle.",
  },
  {
    title: "Automatisierung",
    desc: "End-to-End Pipelines, Vector Databases und skalierbare Inference-Infrastruktur.",
  },
  {
    title: "Software Architektur",
    desc: "Saubere, evolutionäre Systeme mit KI API's, Cloud-Servern und  fuer lange Lebenszyklen.",
  },
];

function HomePage() {
  return (
    <main className="relative">
      <SiteNav />

      <ParallaxHero
        image={heroImage}
        eyebrow="AI Engineer · Software Architekt"
        title={
          <>
            KI mit <span className="text-gradient">Architektur</span>.
            <br />
            Softwareentwicklung mit <span className="text-gradient">Herz</span>.
          </>
        }
        subtitle="Ich konstruiere intelligente Agentic u Generative AI Systeme . von der ersten Idee bis zum Production-Deployment."
      />

      {/* Stats */}
      <section className="relative py-32 px-6">
        <div className="mx-auto max-w-7xl grid grid-cols-2 md:grid-cols-4 gap-px bg-border rounded-2xl overflow-hidden glass">
          {stats.map((s, i) => (
            <Reveal key={s.label} delay={i * 100}>
              <div className="p-8 md:p-12 bg-background/40 h-full">
                <div className="text-5xl md:text-6xl font-display font-bold text-gradient">
                  {s.value}
                </div>
                <div className="mt-3 text-sm uppercase tracking-[0.2em] text-muted-foreground">
                  {s.label}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Capabilities */}
      <section className="relative py-32 px-6">
        <div className="mx-auto max-w-7xl">
          <Reveal>
            <div className="mb-20 max-w-3xl">
              <div className="text-xs uppercase tracking-[0.3em] text-primary mb-4">
                Was ich baue
              </div>
              <h2 className="text-4xl md:text-6xl font-bold leading-tight">
                Drei Disziplinen, <span className="text-gradient">ein System</span>.
              </h2>
            </div>
          </Reveal>

          <div className="grid md:grid-cols-3 gap-6">
            {capabilities.map((c, i) => (
              <Reveal key={c.title} delay={i * 120}>
                <div className="group relative h-full p-8 rounded-2xl glass hover:glow-ring transition-all duration-500">
                  <div className="absolute top-6 right-6 text-xs font-mono text-muted-foreground">
                    0{i + 1}
                  </div>
                  <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-primary to-accent mb-6 animate-float" />
                  <h3 className="text-2xl font-semibold mb-3">{c.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{c.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-40 px-6">
        <div className="absolute inset-0 grid-bg opacity-20" />
        <Reveal>
          <div className="relative mx-auto max-w-4xl text-center">
            <h2 className="text-4xl md:text-6xl font-bold leading-tight">
              Lass uns etwas bauen, das <span className="text-gradient">denkt</span>.
            </h2>
            <p className="mt-6 text-lg text-muted-foreground max-w-xl mx-auto">
              Von Discovery bis Deployment — ich begleite dein KI-Vorhaben mit klarem Blick.
            </p>
            <div className="mt-10 flex flex-wrap gap-4 justify-center">
              <Link
                to="/kontakt"
                className="px-8 py-4 rounded-full bg-gradient-to-r from-primary to-accent text-primary-foreground font-medium hover:opacity-90 transition glow-ring"
              >
                Projekt starten
              </Link>
              <Link
                to="/projekte"
                className="px-8 py-4 rounded-full border border-border hover:bg-secondary transition"
              >
                Projekte ansehen
              </Link>
            </div>
          </div>
        </Reveal>
      </section>

      <SiteFooter />
    </main>
  );
}
