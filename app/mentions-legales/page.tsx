import LegalPageShell from "@/components/legal/LegalPageShell";
import { LEGAL_INFO } from "@/lib/legal/info";

function H2({ children }: { children: string }) {
  return <h2 className="mt-2 text-lg serif" style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 500, color: "#1c1917" }}>{children}</h2>;
}

export default function MentionsLegalesPage() {
  return (
    <LegalPageShell kicker="informations légales" title="Mentions légales" updated="21 juillet 2026">
      <section>
        <H2>Éditeur du site</H2>
        <p>
          Le site folyo.page (« Folyo ») est édité par {LEGAL_INFO.publisherName}.<br />
          Statut : {LEGAL_INFO.legalStatus}<br />
          SIRET : {LEGAL_INFO.siret}<br />
          Adresse : {LEGAL_INFO.address}<br />
          Email : <a href={`mailto:${LEGAL_INFO.email}`} style={{ color: "#c9a96e" }}>{LEGAL_INFO.email}</a><br />
          Téléphone : {LEGAL_INFO.phone}
        </p>
      </section>

      <section>
        <H2>Directeur de la publication</H2>
        <p>{LEGAL_INFO.publisherName}.</p>
      </section>

      <section>
        <H2>Hébergement</H2>
        <p>
          Le site est hébergé par {LEGAL_INFO.host.name}, {LEGAL_INFO.host.address}.
        </p>
      </section>

      <section>
        <H2>Propriété intellectuelle</H2>
        <p>
          La marque « Folyo », le nom de domaine, le code source, les textes et l&apos;interface du site sont la propriété exclusive de l&apos;éditeur, sauf mention contraire. Toute reproduction ou représentation, totale ou partielle, sans autorisation préalable est interdite.
        </p>
        <p>
          Le contenu généré pour ton propre portfolio (textes, mise en page, thème) t&apos;appartient — voir les <a href="/cgu" style={{ color: "#c9a96e" }}>Conditions Générales</a> pour le détail.
        </p>
      </section>

      <section>
        <H2>Contact</H2>
        <p>
          Pour toute question relative à ces mentions légales : <a href={`mailto:${LEGAL_INFO.email}`} style={{ color: "#c9a96e" }}>{LEGAL_INFO.email}</a>, ou via la <a href="/contact" style={{ color: "#c9a96e" }}>page contact</a>.
        </p>
      </section>
    </LegalPageShell>
  );
}
