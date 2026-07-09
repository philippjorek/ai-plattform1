import { createFileRoute } from "@tanstack/react-router";
import heroImage from "../assets/hero-projects.jpg";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { ParallaxHero } from "@/components/ParallaxHero";
import { Reveal } from "@/components/Reveal";

export const Route = createFileRoute("/projekte")({
  head: () => ({
    meta: [
      { title: "Agentic AI Projekte" },
      { name: "description", content: "Eine Auswahl von KI und Software Projekten RAG, Agenten, Realtime und mehr." },
      { property: "og:title", content: "AI Projekte" },
      { property: "og:description", content: "AI-Projekte mit echtem Impact." },
    ],
  }),
  component: ProjectsPage,
});


const projects = [
  {
    year: "2026",
    title: "Workflow-Automatisierung",
    category: "RAG Excel SQL Orchestration",
    desc: "AI Agent nutzt Knowledgebase um Excel-Daten in eine SQL-Datenbank zu schreiben und reduziert Redaktions-Arbeit damit um 80.",
  },

  {
    year: "2026",
    title: "Claude Code -  Software-Migration",
    category: "Softwareentwicklung LLM Architektur",
    desc: "Migration eines Software-Projekts des CMS Drupal in PHP und SQL mit JSON APIs auf die neuste Version.",
  },


  {
    year: "2026",
    title: "Local LLM  - Chat-Bot",
    category: "Docker LLM Generative AI",
    desc: "Interne Entwicklung eines localen Chat-Bots und eigener Knowledgebase mit lokalem Docker und Open-WebUI.",
  },


  {
    year: "2025",
    title: "OpenAI - Custom Agent",
    category: "LLM Open Source",
    desc: "Entwicklung und Veroffentlichung des Open Source Projekts AImulator.com zur KI gestutzten  Content-Generierung.",
  },
];

function ProjectsPage() {
  return (
    <main className="relative">
      <SiteNav />

      <ParallaxHero
        image={heroImage}
        eyebrow="Selected Work"
        title={
          <>
            Arbeit, die <span className="text-gradient">funktioniert</span>.
          </>
        }
        subtitle="Sechs ausgewählte Projekte — von RAG-Engines bis zu Vision-Pipelines."
      />

      <section className="relative py-32 px-6">
        <div className="mx-auto max-w-6xl">
          <div className="space-y-px bg-border rounded-2xl overflow-hidden">
            {projects.map((p, i) => (
              <Reveal key={p.title} delay={i * 60}>
                <article className="group relative bg-background/60 hover:bg-card/80 transition-all duration-500 p-8 md:p-12 grid md:grid-cols-[80px_1fr_200px] gap-6 md:gap-12 items-start cursor-pointer">
                  <div className="text-sm font-mono text-muted-foreground">{p.year}</div>
                  <div>
                    <h3 className="text-2xl md:text-3xl font-display font-semibold mb-2 group-hover:text-gradient transition-all">
                      {p.title}
                    </h3>
                    <p className="text-muted-foreground leading-relaxed max-w-2xl">
                      {p.desc}
                    </p>
                  </div>
                  <div className="text-xs uppercase tracking-[0.2em] text-primary md:text-right">
                    {p.category}
                  </div>
                  <div className="absolute left-0 top-0 w-0 h-px bg-gradient-to-r from-primary to-accent group-hover:w-full transition-all duration-700" />
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
