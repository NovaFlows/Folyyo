import Link from "next/link";
import { Clock } from "lucide-react";
import { getPortfoliosByUser, getViewCountsForUser, getUserSettings, hasUserReviewed } from "@/lib/db/queries";
import { checkFreshness } from "@/lib/freshness/check";
import PortfolioCard from "./PortfolioCard";
import MultiPortfolioBrowser from "./MultiPortfolioBrowser";
import FreshnessBanner from "./FreshnessBanner";
import ReviewPopup from "./ReviewPopup";
import { getDictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/types";
import { isAdmin } from "@/lib/auth/admin";
import type { UserSettings } from "@/types";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

// Corps du dashboard, extrait de page.tsx pour être réutilisable tel quel par
// la route de capture d'écran locale (app/shot/dashboard) : elle rend
// exactement le même visuel sans repasser par l'authentification Clerk.
// L'auth (et donc la détermination du userId) reste à la charge de l'appelant.
export default async function DashboardContent({
  userId,
  locale,
  withReviewPopup = true,
  withFreshness = true,
}: {
  userId: string;
  locale: Locale;
  // Désactivables pour la capture d'écran : le popup d'avis polluerait l'image,
  // et le check de fraîcheur frappe les API GitHub/YouTube ET écrit en base
  // (upsertSyncState) — effets de bord indésirables pour un simple rendu.
  withReviewPopup?: boolean;
  withFreshness?: boolean;
}) {
  const t = getDictionary(locale);

  const [portfolios, viewCounts, settings, alreadyReviewed] = await Promise.all([
    getPortfoliosByUser(userId),
    getViewCountsForUser(userId),
    getUserSettings(userId),
    hasUserReviewed(userId),
  ]);

  // Un portfolio par compte, sauf les comptes "lifetime" — voir
  // app/api/portfolio/generate/route.ts pour la garde serveur équivalente.
  const canCreateMore = isAdmin(userId) || settings?.subscription_status === "lifetime" || portfolios.length === 0;

  // Popup de notation : proposé au plus tôt 1 jour après l'inscription, jamais
  // si un avis existe déjà. Le cooldown "fermé sans noter" (7 jours) est géré
  // côté client dans ReviewPopup (localStorage) — cette garde-ci ne concerne
  // que "compte assez ancien" + "pas encore noté", vérifiés en base à chaque
  // chargement du dashboard.
  const reviewPopupEligible = !alreadyReviewed
    && !!settings
    && Date.now() - new Date(settings.created_at).getTime() >= ONE_DAY_MS;

  // Nudge de fraîcheur GitHub/YouTube — best-effort, ne doit jamais faire
  // planter le dashboard si une API externe est indisponible.
  const freshness = withFreshness
    ? await Promise.all(
        portfolios.map(async (p) => ({ portfolio: p, result: await checkFreshness(p).catch(() => null) })),
      )
    : [];

  return (
    <div>
      {withReviewPopup && <ReviewPopup locale={locale} eligible={reviewPopupEligible} />}

      {settings && (
        <TrialBanner settings={settings} totalViews={Object.values(viewCounts).reduce((sum, v) => sum + v.total, 0)} locale={locale} />
      )}

      <div className="mb-10 flex items-end justify-between">
        <div>
          <p className="mono text-xs tracking-widest uppercase mb-2" style={{ color: "#a09a94", letterSpacing: "0.12em" }}>{t.dashboard.kicker}</p>
          <h1 className="text-3xl serif" style={{ fontWeight: 500, color: "#1c1917" }}>
            {portfolios.length === 0 ? t.dashboard.noneYet : portfolios.length === 1 ? t.dashboard.myPortfolioTitle : t.dashboard.count(portfolios.length)}
          </h1>
        </div>
        {canCreateMore && (
          <Link href="/onboarding"
            className="rounded-full px-6 py-2.5 text-sm font-medium text-white transition hover:opacity-80"
            style={{ background: "#1c1917" }}>
            {t.dashboardNav.newPortfolioShort}
          </Link>
        )}
      </div>

      {freshness.map(({ portfolio, result }) => (
        result && (result.newRepos.length > 0 || result.newVideos.length > 0) ? (
          <FreshnessBanner key={portfolio.id} portfolioId={portfolio.id} portfolioName={portfolio.name}
            newRepos={result.newRepos} newVideos={result.newVideos} />
        ) : null
      ))}

      {!portfolios.length ? <EmptyState t={t} /> : portfolios.length === 1 ? (
        // Un seul portfolio (le cas courant, hors comptes lifetime) : la grille
        // de cartes n'a plus de sens à un seul élément — on montre la carte de
        // gestion à gauche et un vrai aperçu du site à droite sur grand écran.
        <div className="flex flex-col gap-6 lg:flex-row" style={{ alignItems: "flex-start" }}>
          <div className="w-full lg:max-w-sm lg:shrink-0" style={{ alignSelf: "flex-start", marginTop: 0 }}>
            <PortfolioCard portfolio={portfolios[0]} views={viewCounts[portfolios[0].id]} locale={locale} />
          </div>
          {portfolios[0].status === "live" && portfolios[0].slug && (
            <PortfolioPreviewPanel slug={portfolios[0].slug} />
          )}
        </div>
      ) : (
        // Plusieurs portfolios (comptes admin/lifetime) : grille cliquable +
        // aperçu du portfolio sélectionné à droite.
        <MultiPortfolioBrowser portfolios={portfolios} viewCounts={viewCounts} locale={locale} />
      )}
    </div>
  );
}

// Aperçu en direct du site public (iframe, pas une reconstruction séparée —
// garantit que c'est exactement ce que voient les visiteurs) — masqué en
// dessous de lg, où il n'y a pas la place de le montrer sans écraser le reste.
function PortfolioPreviewPanel({ slug }: { slug: string }) {
  return (
    <div className="hidden min-w-0 flex-1 lg:block" style={{ alignSelf: "flex-start", marginTop: 0 }}>
      {/* Hauteur calée sur le viewport (pas une valeur fixe) : le cadre entier
          — barre "navigateur" comprise — doit tenir dans l'écran visible sans
          forcer un défilement de la page du dashboard elle-même. */}
      <div className="overflow-hidden rounded-2xl border flex flex-col"
        style={{ borderColor: "rgba(0,0,0,0.08)", height: "calc(100vh - 15rem)", minHeight: 320, maxHeight: 640 }}>
        <div className="flex shrink-0 items-center gap-3 border-b px-4 py-3" style={{ borderColor: "rgba(0,0,0,0.06)", background: "#f0ece6" }}>
          <div className="flex gap-1.5">
            <div className="h-3 w-3 rounded-full" style={{ background: "rgba(0,0,0,0.1)" }} />
            <div className="h-3 w-3 rounded-full" style={{ background: "rgba(0,0,0,0.1)" }} />
            <div className="h-3 w-3 rounded-full" style={{ background: "rgba(0,0,0,0.1)" }} />
          </div>
          <div className="flex-1 rounded-md px-3 py-1 text-center text-xs" style={{ background: "rgba(255,255,255,0.7)", color: "#78716c", fontFamily: "monospace" }}>
            folyo.page/{slug}
          </div>
        </div>
        <iframe src={`/${slug}`} title={`Aperçu de folyo.page/${slug}`}
          style={{ width: "100%", flex: 1, minHeight: 0, border: "none", display: "block" }} />
      </div>
    </div>
  );
}

// Bandeau "J-X avant expiration · X vues" — visible uniquement pendant
// l'essai (jamais après, actif ou expiré : pas de bruit visuel permanent une
// fois l'essai terminé, voir hasActiveAccess pour la garde d'accès réelle,
// gérée ailleurs). Placé tout en haut du dashboard, avant même le titre —
// c'est le levier de conversion le plus visible de la page.
function TrialBanner({ settings, totalViews, locale }: { settings: UserSettings; totalViews: number; locale: Locale }) {
  const t = getDictionary(locale).dashboard.trialBanner;
  if (settings.subscription_status !== "trialing") return null;
  const daysLeft = Math.ceil((new Date(settings.trial_ends_at).getTime() - Date.now()) / ONE_DAY_MS);
  if (daysLeft <= 0) return null;

  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4"
      style={{ background: "rgba(201,169,110,0.08)", border: "1px solid rgba(201,169,110,0.2)" }}>
      <div className="flex items-center gap-2.5">
        <Clock size={16} strokeWidth={1.75} style={{ flexShrink: 0, color: "#c9a96e" }} />
        <p className="text-sm" style={{ color: "#1c1917" }}>
          <strong>{daysLeft <= 1 ? t.daysLeftUrgent : t.daysLeft(daysLeft)}</strong> · {t.views(totalViews)}
        </p>
      </div>
      <Link href="/billing"
        className="shrink-0 rounded-full px-4 py-2 text-xs font-medium text-white transition hover:opacity-80"
        style={{ background: "#1c1917" }}>
        {t.cta}
      </Link>
    </div>
  );
}

function EmptyState({ t }: { t: ReturnType<typeof getDictionary> }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <Link href="/onboarding"
        className="mb-8 h-16 w-16 rounded-full flex items-center justify-center transition hover:opacity-70"
        style={{ background: "#f0ece6", border: "1px solid rgba(0,0,0,0.06)" }}>
        <span className="mono" style={{ color: "#c9a96e", fontSize: "1.25rem" }}>+</span>
      </Link>
      <h2 className="mb-3 text-xl serif" style={{ fontWeight: 500, color: "#1c1917" }}>
        {t.dashboard.emptyTitle}
      </h2>
      <p className="mb-8 text-sm" style={{ color: "#78716c" }}>{t.dashboard.emptyDesc}</p>
      <Link href="/onboarding"
        className="rounded-full px-8 py-3 text-sm font-medium text-white transition hover:opacity-80"
        style={{ background: "#1c1917" }}>
        {t.dashboard.emptyCta}
      </Link>
    </div>
  );
}
