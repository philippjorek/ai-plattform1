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
      {
        name: "description",
        content: "Datenschutzerklärung gemäß DSGVO.",
      },
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
            <div className="space-y-10 leading-relaxed text-foreground/90">
              <div className="space-y-3">
                <h2 className="text-xl font-semibold">1. Verantwortlicher</h2>
                <p>
                  Verantwortlich für die Datenverarbeitung auf dieser Website im
                  Sinne der Datenschutz-Grundverordnung (DSGVO) ist:
                </p>
                <p>
                  iMPLI Informations-Systeme GmbH
                  <br />
                  Mellerswiesen 17
                  <br />
                  34125 Kassel
                  <br />
                  Unternehmenssitz: Paderborn
                </p>
                <p>
                  eMail:{" "}
                  <a
                    href="mailto:jorek@impli.de"
                    className="text-primary hover:underline"
                  >
                    jorek@impli.de
                  </a>
                  <br />
                  Tel.: +49 (0)561-9877696
                </p>
              </div>

              <div className="space-y-3">
                <h2 className="text-xl font-semibold">
                  2. Grundsätze der Datenverarbeitung
                </h2>
                <p>
                  Diese Website ist bewusst datensparsam gestaltet. Es werden
                  keine Cookies gesetzt und keine externen Dienste oder
                  Schnittstellen (APIs) Dritter eingebunden — es findet also
                  weder Tracking noch eine Übermittlung Ihrer Daten an Dritte
                  statt. Personenbezogene Daten werden ausschließlich dann
                  verarbeitet, wenn Sie uns diese aktiv über das Kontaktformular
                  mitteilen. Es findet keine Auswertung Ihres Nutzungsverhaltens
                  zu Werbezwecken statt und es wird keine Werbung eingeblendet.
                </p>
              </div>

              <div className="space-y-3">
                <h2 className="text-xl font-semibold">3. Kontaktformular</h2>
                <p>
                  Wenn Sie uns über das Kontaktformular eine Nachricht senden,
                  werden die von Ihnen eingegebenen Daten (Name, E-Mail-Adresse,
                  optional Unternehmen sowie Ihre Nachricht) zusammen mit dem
                  Zeitpunkt der Übermittlung auf unserem Server gespeichert.
                </p>
                <p>
                  Die Verarbeitung dieser Daten erfolgt ausschließlich zu dem
                  Zweck, Ihre Anfrage zu bearbeiten und Ihnen zu antworten.
                  Rechtsgrundlage hierfür ist Art. 6 Abs. 1 lit. b DSGVO
                  (Verarbeitung zur Durchführung vorvertraglicher Maßnahmen bzw.
                  zur Erfüllung eines Vertrags), sofern Ihre Anfrage im
                  Zusammenhang mit einer möglichen Zusammenarbeit steht, sowie
                  hilfsweise Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse
                  an der Beantwortung eingehender Anfragen).
                </p>
                <p>
                  Ihre Daten werden nicht an Dritte weitergegeben und nicht für
                  Werbezwecke genutzt. Sie werden nur so lange gespeichert, wie
                  dies zur Bearbeitung Ihrer Anfrage und einer möglichen
                  Anschlusskommunikation erforderlich ist, und anschließend
                  gelöscht, sofern keine gesetzlichen Aufbewahrungspflichten
                  entgegenstehen.
                </p>
                <p>
                  Zum Schutz vor missbräuchlicher Nutzung des Formulars (z. B.
                  automatisierten Massenanfragen) wird beim Absenden kurzzeitig
                  und ausschließlich im Arbeitsspeicher unseres Servers die
                  IP-Adresse zur Rate-Begrenzung herangezogen. Diese wird nicht
                  dauerhaft gespeichert, nicht mit Ihren übrigen Formulardaten
                  verknüpft und nach wenigen Minuten automatisch verworfen.
                </p>
              </div>

              <div className="space-y-3">
                <h2 className="text-xl font-semibold">
                  4. Keine Cookies, kein Tracking, keine externen Dienste
                </h2>
                <p>
                  Diese Website verwendet keine Cookies, keine Analyse-Tools,
                  kein Tracking und keine Social-Media-Plugins. Es werden keine
                  externen APIs oder Dienste Dritter (z. B. Schriftarten, Karten
                  oder Werbenetzwerke) eingebunden, über die Daten an Dritte
                  abfließen könnten.
                </p>
              </div>

              <div className="space-y-3">
                <h2 className="text-xl font-semibold">5. Ihre Rechte</h2>
                <p>Ihnen stehen nach der DSGVO folgende Rechte zu:</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>
                    Auskunft über die zu Ihrer Person gespeicherten Daten (Art.
                    15 DSGVO)
                  </li>
                  <li>Berichtigung unrichtiger Daten (Art. 16 DSGVO)</li>
                  <li>
                    Löschung Ihrer bei uns gespeicherten Daten (Art. 17 DSGVO)
                  </li>
                  <li>Einschränkung der Datenverarbeitung (Art. 18 DSGVO)</li>
                  <li>Datenübertragbarkeit (Art. 20 DSGVO)</li>
                  <li>Widerspruch gegen die Verarbeitung (Art. 21 DSGVO)</li>
                </ul>
                <p>
                  Zur Ausübung dieser Rechte genügt eine formlose Nachricht an
                  die oben genannte E-Mail-Adresse. Darüber hinaus steht Ihnen
                  ein Beschwerderecht bei einer Datenschutz-Aufsichtsbehörde zu.
                </p>
              </div>

              <div className="space-y-3">
                <h2 className="text-xl font-semibold">
                  6. Aktualität dieser Erklärung
                </h2>
                <p>
                  Diese Datenschutzerklärung hat den Stand August 2026 und wird
                  angepasst, sobald sich die hier beschriebene Datenverarbeitung
                  ändert.
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
