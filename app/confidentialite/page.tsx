import LegalPageShell from "@/components/legal/LegalPageShell";
import { LEGAL_INFO } from "@/lib/legal/info";

function H2({ children }: { children: string }) {
  return <h2 className="mt-2 text-lg serif" style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 500, color: "#1c1917" }}>{children}</h2>;
}

const PROCESSORS = [
  { name: "Clerk", role: "Authentification et gestion des comptes (email, mot de passe, connexions Google/GitHub/Apple/LinkedIn)." },
  { name: "Neon", role: "Base de données (informations de compte, contenu des portfolios générés)." },
  { name: "Anthropic (Claude)", role: "Génération et modification par IA du contenu de ton portfolio à partir des informations que tu fournis (CV, profils, instructions d'édition)." },
  { name: "Cloudflare R2", role: "Stockage des fichiers (CV importés, code source généré de chaque portfolio)." },
  { name: "Stripe", role: "Paiement de l'abonnement — Folyo ne stocke jamais ton numéro de carte bancaire, géré exclusivement par Stripe." },
  { name: "Vercel", role: "Hébergement et exécution du site." },
];

export default function ConfidentialitePage() {
  return (
    <LegalPageShell kicker="rgpd" title="Politique de confidentialité" updated="21 juillet 2026">
      <section>
        <H2>Responsable du traitement</H2>
        <p>
          {LEGAL_INFO.publisherName}, éditeur du site folyo.page, est responsable du traitement des données décrites ci-dessous. Contact : <a href={`mailto:${LEGAL_INFO.email}`} style={{ color: "#c9a96e" }}>{LEGAL_INFO.email}</a>.
        </p>
      </section>

      <section>
        <H2>Données collectées</H2>
        <ul className="list-disc pl-5 flex flex-col gap-1">
          <li>Compte : email, mot de passe (géré par Clerk, jamais stocké en clair par nos soins), pays, langue préférée.</li>
          <li>Contenu du portfolio : nom, titre, CV importé (PDF), pseudos/URLs de réseaux (GitHub, YouTube, LinkedIn, Instagram, Twitter/X), texte et images que tu ajoutes dans l&apos;éditeur.</li>
          <li>Facturation : statut d&apos;abonnement, identifiant client Stripe — jamais les coordonnées bancaires elles-mêmes.</li>
          <li>Technique : cookie de langue, cookie de session (authentification), identifiant anonyme de visite (mesure d&apos;audience de ton propre portfolio public, sans donnée personnelle ni traceur publicitaire).</li>
        </ul>
      </section>

      <section>
        <H2>Finalités</H2>
        <ul className="list-disc pl-5 flex flex-col gap-1">
          <li>Créer et sécuriser ton compte.</li>
          <li>Générer et modifier ton portfolio par IA à partir des informations que tu fournis.</li>
          <li>Héberger et afficher ton portfolio à l&apos;adresse publique que tu choisis.</li>
          <li>Gérer ton abonnement et ta facturation.</li>
          <li>Répondre à tes demandes de support.</li>
        </ul>
      </section>

      <section>
        <H2>Destinataires des données</H2>
        <p>Tes données sont partagées avec les prestataires techniques strictement nécessaires au fonctionnement du service :</p>
        <ul className="list-disc pl-5 flex flex-col gap-1">
          {PROCESSORS.map((p) => (
            <li key={p.name}><strong style={{ color: "#1c1917" }}>{p.name}</strong> — {p.role}</li>
          ))}
        </ul>
        <p>Aucune donnée n&apos;est vendue à des tiers ni utilisée à des fins publicitaires.</p>
      </section>

      <section>
        <H2>Durée de conservation</H2>
        <p>
          Tes données sont conservées tant que ton compte est actif. En cas de suppression de compte, les données associées (portfolios, fichiers, informations de facturation non requises légalement) sont supprimées sous 30 jours, à l&apos;exception des données que la loi nous impose de conserver (ex. factures).
        </p>
      </section>

      <section>
        <H2>Tes droits</H2>
        <p>
          Conformément au RGPD, tu disposes d&apos;un droit d&apos;accès, de rectification, d&apos;effacement, de portabilité et d&apos;opposition sur tes données. Tu peux exercer ces droits directement depuis les paramètres de ton compte (modification, suppression) ou en écrivant à <a href={`mailto:${LEGAL_INFO.email}`} style={{ color: "#c9a96e" }}>{LEGAL_INFO.email}</a>. Tu peux aussi introduire une réclamation auprès de la CNIL (cnil.fr).
        </p>
      </section>

      <section>
        <H2>Cookies</H2>
        <p>
          Le site utilise uniquement des cookies techniques nécessaires à son fonctionnement (session de connexion, préférence de langue, identifiant anonyme de visite) — aucun cookie publicitaire ou de traçage tiers.
        </p>
      </section>
    </LegalPageShell>
  );
}
