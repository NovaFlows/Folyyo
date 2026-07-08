import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { getPortfolioBySlugOrId, getVersionsByPortfolio, getEditsByPortfolio } from "@/lib/db/queries";
import PortfolioEditor from "./PortfolioEditor";
import type { PortfolioStatus } from "@/types";

const STATUS_CONFIG: Record<PortfolioStatus, { label: string; color: string; dot: string }> = {
  draft:      { label: "Brouillon",    color: "#a09a94", dot: "#a09a94" },
  generating: { label: "Génération…",  color: "#d97706", dot: "#d97706" },
  deploying:  { label: "Déploiement…", color: "#0891b2", dot: "#0891b2" },
  live:       { label: "En ligne",     color: "#c9a96e", dot: "#c9a96e" },
  error:      { label: "Erreur",       color: "#dc2626", dot: "#dc2626" },
};

const PROFILE_LABEL: Record<string, string> = {
  developer: "Développeur", artist: "Artiste", fashion: "Mode", other: "Autre",
};

export default async function PortfolioPage({ params }: { params: { slug: string } }) {
  const { userId } = await auth();
  if (!userId) notFound();

  const portfolio = await getPortfolioBySlugOrId(params.slug, userId);
  if (!portfolio) notFound();

  const [versions, edits] = await Promise.all([
    getVersionsByPortfolio(portfolio.id),
    getEditsByPortfolio(portfolio.id),
  ]);

  const status = STATUS_CONFIG[portfolio.status] ?? STATUS_CONFIG.draft;
  const cardStyle = { background: "#f0ece6", border: "1px solid rgba(0,0,0,0.06)" };

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/dashboard" className="mb-1 block text-sm transition hover:opacity-60"
            style={{ color: "#a09a94" }}>
            ← Dashboard
          </Link>
          <h1 className="text-2xl" style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 500, color: "#1c1917" }}>
            {portfolio.name}
          </h1>
          <p className="mt-1 flex items-center gap-1.5 text-sm font-medium" style={{ color: status.color }}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: status.dot }} />
            {status.label}
          </p>
        </div>
        <div className="flex gap-3 flex-wrap">
          {portfolio.site_json && (
            <a href={`/preview/${portfolio.slug ?? portfolio.id}?mode=edit`}
              className="rounded-full px-5 py-2.5 text-sm font-medium transition hover:opacity-80"
              style={{ background: "#1c1917", color: "white" }}>
              Éditer visuellement
            </a>
          )}
          {portfolio.deployment_url && (
            <a href={portfolio.deployment_url} target="_blank" rel="noopener noreferrer"
              className="rounded-full px-5 py-2.5 text-sm font-medium transition hover:opacity-80"
              style={{ background: "rgba(201,169,110,0.12)", color: "#c9a96e" }}>
              Voir le site ↗
            </a>
          )}
          {!portfolio.deployment_url && portfolio.source_code_key && (
            <DeployButton portfolioId={portfolio.id} />
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <PortfolioEditor portfolioId={portfolio.id} hasCode={!!portfolio.source_code_key} edits={edits} />
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl p-5" style={cardStyle}>
            <h3 className="mb-4 text-xs tracking-widest uppercase" style={{ color: "#a09a94" }}>Infos</h3>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt style={{ color: "#a09a94" }}>Profil</dt>
                <dd style={{ color: "#1c1917" }}>{PROFILE_LABEL[portfolio.profile_type] ?? portfolio.profile_type}</dd>
              </div>
              <div className="flex justify-between">
                <dt style={{ color: "#a09a94" }}>Statut</dt>
                <dd style={{ color: status.color }}>{status.label}</dd>
              </div>
              {portfolio.deployment_url && (
                <div className="flex flex-col gap-1">
                  <dt className="text-xs" style={{ color: "#a09a94" }}>URL</dt>
                  <dd>
                    <a href={portfolio.deployment_url} target="_blank" rel="noopener noreferrer"
                      className="block truncate text-xs transition hover:opacity-80"
                      style={{ color: "#c9a96e" }}>
                      {portfolio.deployment_url.replace("https://", "")}
                    </a>
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {versions.length > 0 && (
            <div className="rounded-2xl p-5" style={cardStyle}>
              <h3 className="mb-4 text-xs tracking-widest uppercase" style={{ color: "#a09a94" }}>Historique</h3>
              <div className="space-y-3">
                {versions.map((v) => (
                  <div key={v.id} className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium" style={{ color: "#1c1917" }}>
                        {v.edit_summary ?? `Version ${v.version_num}`}
                      </p>
                      <p className="text-xs" style={{ color: "#a09a94" }}>
                        {new Date(v.created_at).toLocaleDateString("fr-FR")}
                      </p>
                    </div>
                    <RollbackButton portfolioId={portfolio.id} versionId={v.id} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DeployButton({ portfolioId }: { portfolioId: string }) {
  return (
    <form action="/api/portfolio/deploy" method="POST">
      <input type="hidden" name="portfolioId" value={portfolioId} />
      <button type="submit"
        className="rounded-full px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-80"
        style={{ background: "#1c1917" }}>
        Déployer →
      </button>
    </form>
  );
}

function RollbackButton({ portfolioId, versionId }: { portfolioId: string; versionId: string }) {
  return (
    <form action="/api/portfolio/rollback" method="POST">
      <input type="hidden" name="portfolioId" value={portfolioId} />
      <input type="hidden" name="versionId" value={versionId} />
      <button type="submit"
        className="shrink-0 rounded-lg px-2.5 py-1 text-xs transition hover:opacity-80"
        style={{ border: "1px solid rgba(0,0,0,0.1)", color: "#78716c" }}>
        Restaurer
      </button>
    </form>
  );
}
