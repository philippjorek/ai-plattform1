import { createFileRoute } from "@tanstack/react-router";
import heroImage from "@/assets/hero-contact.jpg";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { ParallaxHero } from "@/components/ParallaxHero";
import { Reveal } from "@/components/Reveal";

export const Route = createFileRoute("/impressum")({
  head: () => ({
    meta: [
      { title: "Impressum — Service-mit-Herz" },
      { name: "description", content: "Impressum der iMPLI Informations-Systeme GmbH." },
    ],
  }),
  component: ImpressumPage,
});

function ImpressumPage() {
  return (
    <main className="relative">
      <SiteNav />

      <ParallaxHero
        image={heroImage}
        eyebrow="Rechtliches"
        title={<>Impressum</>}
      />

      <section className="relative py-32 px-6">
        <div className="mx-auto max-w-3xl">
          <Reveal>
            <div className="space-y-6 leading-relaxed">
              <p className="text-lg font-semibold">iMPLI Informations-Systeme GmbH</p>
              <p>
                iMPLI Informations-Systeme GmbH
                <br />
                Mellerswiesen 17
                <br />
                34125 Kassel
              </p>
              <p>Unternehmenssitz: Paderborn</p>
              <p>
                eMail:{" "}
                <a href="mailto:jorek@impli.de" className="text-primary hover:underline">
                  jorek@impli.de
                </a>
              </p>
              <p>Tel.: +49 (0)561-9877696</p>
              <hr className="border-border" />
              <p>
                Amtsgericht Paderborn, HRB 8602, Geschäftsführer:
                <br />
                Philipp Jorek, Umsatzst.-Id: DE815003392
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
