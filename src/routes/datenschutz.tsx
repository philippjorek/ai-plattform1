import { createFileRoute } from "@tanstack/react-router";
import heroImage from "@/assets/hero-contact.jpg";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { ParallaxHero } from "@/components/ParallaxHero";
import { Reveal } from "@/components/Reveal";

export const Route = createFileRoute("/datenschutz")({
  head: () => ({
    meta: [
      { title: "Datenschutz — Service-mit-Herz" },
      { name: "description", content: "Datenschutzerklärung." },
    ],
  }),
  component: DatenschutzPage,
});

function DatenschutzPage() {
  return (
    <main className="relative">
      <SiteNav />

      <ParallaxHero
        image={heroImage}
        eyebrow="Rechtliches"
        title={<>Datenschutz</>}
      />

      <section className="relative py-32 px-6">
        <div className="mx-auto max-w-3xl">
          <Reveal>
            <p className="text-muted-foreground leading-relaxed">
              Die Datenschutzerklärung wird in Kürze ergänzt.
            </p>
          </Reveal>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
