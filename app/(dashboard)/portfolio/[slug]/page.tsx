import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { getPortfolioBySlugOrId, getVersionsByPortfolio, getEditsByPortfolio, getViewCountsForUser, getViewSourcesForPortfolio } from "@/lib/db/queries";
import PortfolioEditor from "./PortfolioEditor";
import ViewsBreakdown from "./ViewsBreakdown";
import { PROFILE_LABEL_FULL } from "@/lib/profile-labels";
import type { PortfolioStatus } from "@/types";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";

const STATUS_COLOR: Record<PortfolioStatus, { color: string; dot: string }> = {
  draft:      { color: "#a09a94", dot: "#a09a94" },
  generating: { color: "#d97706", dot: "#d97706" },
  deploying:  { color: "#0891b2", dot: "#0891b2" },
  live:       { color: "#c9a96e", dot: "#c9a96e" },
  editing:    { color: "#d97706", dot: "#d97706" },
  error:      { color: "#dc2626", dot: "#dc2626" },
};

export default async function PortfolioPage({ params }: { params: { slug: string } }) {
  const { userId } = await auth();
  if (!userId) notFound();

  const portfolio = await getPortfolioBySlugOrId(params.slug, userId);
  if (!portfolio) notFound();

  const locale = getLocale();
  const t = getDictionary(locale);

  const [versions, edits, viewCounts, viewSources] = await Promise.all([
    getVersionsByPortfolio(portfolio.id),
    getEditsByPortfolio(portfolio.id),
    getViewCountsForUser(userId),
    getViewSourcesForPortfolio(portfolio.id, locale),
  ]);
  const views = viewCounts[portfolio.id];

  const statusColor = STATUS_COLOR[portfolio.status] ?? STATUS_COLOR.draft;
  const statusLabel = t.dashboard.status[portfolio.status] ?? t.dashboard.status.draft;
  const cardStyle = { background: "#f0ece6", border: "1px solid rgba(0,0,0,0.06)" };

  const shortSlug = portfolio.slug ?? portfolio.id;
  const isLive = portfolio.status === "live";

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/dashboard" className="mb-1 block text-sm transition hover:opacity-60"
            style={{ color: "#a09a94" }}>
            {t.portfolioDetail.back}
          </Link>
          <h1 className="text-2xl" style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 500, color: "#1c1917" }}>
            {portfolio.name}
          </h1>
          <p className="mt-1 flex items-center gap-1.5 text-sm font-medium" style={{ color: statusColor.color }}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: statusColor.dot }} />
            {statusLabel}
          </p>
        </div>
        <div className="flex gap-3 flex-wrap">
          {Boolean(portfolio.site_json) && (
            <a href={`/preview/${portfolio.slug ?? portfolio.id}?mode=edit`}
              className="rounded-full px-5 py-2.5 text-sm font-medium transition hover:opacity-80"
              style={{ background: "#1c1917", color: "white" }}>
              {t.portfolioDetail.editVisually}
            </a>
          )}
          {isLive && (
            <a href={`/${shortSlug}`} target="_blank" rel="noopener noreferrer"
              className="rounded-full px-5 py-2.5 text-sm font-medium transition hover:opacity-80"
              style={{ background: "rgba(201,169,110,0.12)", color: "#c9a96e" }}>
              {t.portfolioDetail.viewSite}
            </a>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <PortfolioEditor portfolioId={portfolio.id} hasCode={!!portfolio.source_code_key} edits={edits} initialStatus={portfolio.status} locale={locale} />
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl p-5" style={cardStyle}>
            <h3 className="mb-4 text-xs tracking-widest uppercase" style={{ color: "#a09a94" }}>{t.portfolioDetail.infosTitle}</h3>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt style={{ color: "#a09a94" }}>{t.portfolioDetail.profileLabel}</dt>
                <dd style={{ color: "#1c1917" }}>{PROFILE_LABEL_FULL[portfolio.profile_type] ?? portfolio.profile_type}</dd>
              </div>
              <div className="flex justify-between">
                <dt style={{ color: "#a09a94" }}>{t.portfolioDetail.statusLabel}</dt>
                <dd style={{ color: statusColor.color }}>{statusLabel}</dd>
              </div>
              {isLive && (
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between">
                    <dt style={{ color: "#a09a94" }}>{t.portfolioDetail.viewsLabel}</dt>
                    <dd style={{ color: "#1c1917" }}>
                      {views && views.total > 0 ? (
                        <>
                          {views.total}
                          {views.last7d > 0 && <span style={{ color: "#22a06b" }}> · {t.dashboard.viewsThisWeek(views.last7d)}</span>}
                        </>
                      ) : (
                        <span style={{ color: "#a09a94" }}>{t.dashboard.noViewsYet}</span>
                      )}
                    </dd>
                  </div>
                  <ViewsBreakdown sources={viewSources} label={t.portfolioDetail.viewSources} />
                </div>
              )}
              {isLive && (
                <div className="flex flex-col gap-1">
                  <dt className="text-xs" style={{ color: "#a09a94" }}>{t.portfolioDetail.urlLabel}</dt>
                  <dd>
                    <a href={`/${shortSlug}`} target="_blank" rel="noopener noreferrer"
                      className="block truncate text-xs transition hover:opacity-80"
                      style={{ color: "#c9a96e" }}>
                      folyo.page/{shortSlug}
                    </a>
                  </dd>
                </div>
              )}
            </dl>
          </div>

          <div className="rounded-2xl p-5" style={cardStyle}>
            <h3 className="mb-1 text-xs tracking-widest uppercase" style={{ color: "#a09a94" }}>{t.portfolioDetail.historyTitle}</h3>
            {versions.some((v) => v.site_json) ? (
              <>
                <p className="mb-4 text-xs" style={{ color: "#a09a94" }}>
                  {t.portfolioDetail.historyDesc}
                </p>
                <div className="space-y-3">
                  {versions.filter((v) => v.site_json).map((v) => (
                    <div key={v.id} className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium" style={{ color: "#1c1917" }}>
                          {v.edit_summary ?? t.portfolioDetail.versionLabel(v.version_num)}
                        </p>
                        <p className="text-xs" style={{ color: "#a09a94" }}>
                          {new Date(v.created_at).toLocaleString(locale === "en" ? "en-US" : locale === "es" ? "es-ES" : "fr-FR")}
                        </p>
                      </div>
                      <RollbackButton portfolioId={portfolio.id} versionId={v.id} label={t.portfolioDetail.restoreBtn} />
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="mt-2 text-xs leading-relaxed" style={{ color: "#a09a94" }}>
                {t.portfolioDetail.historyEmptyPrefix}
                <strong style={{ color: "#78716c" }}>{t.portfolioDetail.historyEmptyBold}</strong>
                {t.portfolioDetail.historyEmptySuffix}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function RollbackButton({ portfolioId, versionId, label }: { portfolioId: string; versionId: string; label: string }) {
  return (
    <form action="/api/portfolio/rollback" method="POST">
      <input type="hidden" name="portfolioId" value={portfolioId} />
      <input type="hidden" name="versionId" value={versionId} />
      <button type="submit"
        className="shrink-0 rounded-lg px-2.5 py-1 text-xs transition hover:opacity-80"
        style={{ border: "1px solid rgba(0,0,0,0.1)", color: "#78716c" }}>
        {label}
      </button>
    </form>
  );
}
