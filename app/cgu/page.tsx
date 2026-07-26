import LegalPageShell from "@/components/legal/LegalPageShell";
import { LEGAL_INFO } from "@/lib/legal/info";

function H2({ children }: { children: string }) {
  return <h2 className="mt-2 text-lg serif" style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 500, color: "#1c1917" }}>{children}</h2>;
}

export default function CguPage() {
  return (
    <LegalPageShell kicker="conditions générales" title="Conditions générales d'utilisation et de vente" updated="21 juillet 2026">
      <section>
        <H2>1. Objet</H2>
        <p>
          Folyo (folyo.page) est un service qui génère et héberge un portfolio professionnel à partir des informations fournies par l&apos;utilisateur (CV, profils, réseaux), avec un éditeur visuel et un assistant IA pour le modifier. Les présentes conditions régissent l&apos;utilisation du service et l&apos;abonnement payant associé.
        </p>
      </section>

      <section>
        <H2>2. Compte</H2>
        <p>
          L&apos;utilisation du service nécessite la création d&apos;un compte (email/mot de passe ou connexion via un fournisseur tiers). Tu es responsable de la confidentialité de tes identifiants et de l&apos;exactitude des informations fournies.
        </p>
      </section>

      <section>
        <H2>3. Essai gratuit et abonnement</H2>
        <p>
          Chaque compte bénéficie d&apos;un essai gratuit de 3 jours, sans carte bancaire requise, donnant accès à l&apos;ensemble des fonctionnalités (génération IA, édition, hébergement du portfolio).
        </p>
        <p>
          À l&apos;issue de l&apos;essai, l&apos;accès à la génération et à l&apos;édition par IA est suspendu tant qu&apos;aucun abonnement n&apos;est actif ; le portfolio déjà publié n&apos;est ni supprimé ni modifié, mais son adresse publique affiche un message d&apos;indisponibilité temporaire. Souscrire à un abonnement restaure l&apos;accès instantanément, sur la même adresse.
        </p>
        <p>
          Deux formules sont proposées : 5,99&nbsp;€/mois ou 49,99&nbsp;€/an (facturation annuelle, environ 30% d&apos;économie par rapport au mensuel). Les prix sont indiqués toutes taxes comprises.
        </p>
      </section>

      <section>
        <H2>4. Paiement et résiliation</H2>
        <p>
          Le paiement est traité par Stripe. L&apos;abonnement se renouvelle automatiquement à chaque échéance (mensuelle ou annuelle) jusqu&apos;à résiliation. Tu peux résilier à tout moment depuis l&apos;espace « Abonnement » de ton compte (portail de gestion Stripe) — la résiliation prend effet à la fin de la période déjà payée, sans remboursement au prorata.
        </p>
      </section>

      <section>
        <H2>5. Droit de rétractation</H2>
        <p>
          Conformément à l&apos;article L221-28 du Code de la consommation, le droit de rétractation ne s&apos;applique pas à un contenu numérique fourni immédiatement après accord exprès du consommateur à son exécution immédiate, avec renoncement au droit de rétractation. En pratique, aucun paiement n&apos;intervient avant la fin de l&apos;essai gratuit de 3 jours, ce qui te laisse le temps d&apos;évaluer le service avant tout engagement financier.
        </p>
      </section>

      <section>
        <H2>6. Contenu et responsabilité</H2>
        <p>
          Tu restes seul responsable du contenu que tu publies via ton portfolio (textes, images, liens), y compris le contenu généré ou modifié par l&apos;assistant IA à partir de tes instructions. Le contenu généré pour ton portfolio t&apos;appartient. Tu t&apos;engages à ne pas publier de contenu illicite, diffamatoire ou portant atteinte aux droits de tiers.
        </p>
        <p>
          Folyo met en œuvre des moyens raisonnables pour assurer la disponibilité du service, sans garantie d&apos;absence totale d&apos;interruption (maintenance, panne d&apos;un prestataire technique).
        </p>
      </section>

      <section>
        <H2>7. Suppression de compte</H2>
        <p>
          Tu peux supprimer ton compte à tout moment depuis les paramètres — cela annule immédiatement tout abonnement Stripe actif et supprime ton/tes portfolio(s) et les données associées.
        </p>
      </section>

      <section>
        <H2>8. Droit applicable</H2>
        <p>
          Les présentes conditions sont soumises au droit français. En cas de litige, une solution amiable sera recherchée avant toute action judiciaire.
        </p>
      </section>

      <section>
        <p className="text-xs" style={{ color: "#a09a94" }}>
          Éditeur : {LEGAL_INFO.publisherName} — voir les <a href="/mentions-legales" style={{ color: "#c9a96e" }}>mentions légales</a> pour les informations complètes.
        </p>
      </section>
    </LegalPageShell>
  );
}
