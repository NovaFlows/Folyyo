import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getPortfoliosByUser, getViewCountsForUser, getUserSettings } from "@/lib/db/queries";
import { checkFreshness } from "@/lib/freshness/check";
import type { Portfolio } from "@/types";
import PortfolioCard from "./PortfolioCard";
import FreshnessBanner from "./FreshnessBanner";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect("/login");

  const locale = getLocale();
  const t = getDictionary(locale);

  const [portfolios, viewCounts, settings] = await Promise.all([
    getPortfoliosByUser(userId),
    getViewCountsForUser(userId),
    getUserSettings(userId),
  ]);

  // Un portfolio par compte, sauf les comptes "lifetime" — voir
  // app/api/portfolio/generate/route.ts pour la garde serveur équivalente.
  const canCreateMore = settings?.subscription_status === "lifetime" || portfolios.length === 0;

  // Nudge de fraîcheur GitHub/YouTube — best-effort, ne doit jamais faire
  // planter le dashboard si une API externe est indisponible.
  const freshness = await Promise.all(
    portfolios.map(async (p) => ({ portfolio: p, result: await checkFreshness(p).catch(() => null) })),
  );

  return (
    <div>
      <div className="mb-10 flex items-end justify-between">
        <div>
          <p className="mono text-xs tracking-widest uppercase mb-2" style={{ color: "#a09a94", letterSpacing: "0.12em" }}>{t.dashboard.kicker}</p>
          <h1 className="text-3xl serif" style={{ fontWeight: 500, color: "#1c1917" }}>
            {portfolios.length === 0 ? t.dashboard.noneYet : t.dashboard.count(portfolios.length)}
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

      {!portfolios.length ? <EmptyState t={t} /> : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {portfolios.map((p: Portfolio) => (
            <PortfolioCard key={p.id} portfolio={p} views={viewCounts[p.id]} locale={locale} />
          ))}
        </div>
      )}
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
