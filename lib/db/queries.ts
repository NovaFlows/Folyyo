import { sql } from "./client";
import type { Portfolio, PortfolioVersion, PortfolioEdit } from "@/types";

// `sql` (Neon) renvoie des lignes génériques — ces deux helpers centralisent
// le cast vers les types de domaine pour ne plus le répéter à chaque requête
// (c'était `as unknown as X[]` dupliqué ~16 fois dans ce fichier).
function many<T>(rows: unknown[]): T[] {
  return rows as T[];
}
function one<T>(rows: unknown[]): T | null {
  return many<T>(rows)[0] ?? null;
}

// ── Portfolios ─────────────────────────────────────────────────────────────

export async function getPortfoliosByUser(userId: string): Promise<Portfolio[]> {
  const rows = await sql`SELECT * FROM portfolios WHERE user_id = ${userId} ORDER BY created_at DESC`;
  return many<Portfolio>(rows);
}

export async function getPortfolioById(id: string, userId: string): Promise<Portfolio | null> {
  const rows = await sql`SELECT * FROM portfolios WHERE id = ${id} AND user_id = ${userId} LIMIT 1`;
  return one<Portfolio>(rows);
}

export async function createPortfolio(data: {
  user_id: string;
  name: string;
  profile_type: string;
  slug?: string;
}): Promise<Portfolio> {
  const rows = await sql`
    INSERT INTO portfolios (user_id, name, profile_type, status, slug)
    VALUES (${data.user_id}, ${data.name}, ${data.profile_type}, 'generating', ${data.slug ?? null})
    RETURNING *
  `;
  return many<Portfolio>(rows)[0];
}

export async function getPortfolioBySlugOrId(slugOrId: string, userId: string): Promise<Portfolio | null> {
  const rows = await sql`
    SELECT * FROM portfolios
    WHERE (slug = ${slugOrId} OR id::text = ${slugOrId}) AND user_id = ${userId}
    LIMIT 1
  `;
  return one<Portfolio>(rows);
}

export async function getPortfolioBySlugPublic(slugOrId: string): Promise<Portfolio | null> {
  const rows = await sql`
    SELECT * FROM portfolios
    WHERE slug = ${slugOrId} OR id::text = ${slugOrId}
    LIMIT 1
  `;
  return one<Portfolio>(rows);
}

export async function setPortfolioStatus(id: string, status: string): Promise<void> {
  await sql`UPDATE portfolios SET status = ${status}, updated_at = now() WHERE id = ${id}`;
}

export async function setPortfolioError(id: string, message: string): Promise<void> {
  // Free the slug so the user can retry with the same slug
  await sql`UPDATE portfolios SET status = 'error', slug = null, error_message = ${message}, updated_at = now() WHERE id = ${id}`;
}

export async function setPortfolioReady(id: string, data: {
  siteJson: unknown;
  inputData: unknown;
  sourceCodeKey: string;
}): Promise<void> {
  await sql`
    UPDATE portfolios SET
      status          = 'draft',
      site_json       = ${JSON.stringify(data.siteJson)}::jsonb,
      input_data      = ${JSON.stringify(data.inputData)}::jsonb,
      source_code_key = ${data.sourceCodeKey},
      updated_at      = now()
    WHERE id = ${id}
  `;
}

export async function setPortfolioDeploying(id: string): Promise<void> {
  await sql`UPDATE portfolios SET status = 'deploying', updated_at = now() WHERE id = ${id}`;
}

export async function setPortfolioLive(id: string, deploymentUrl: string, vercelProjectId?: string | null): Promise<void> {
  await sql`
    UPDATE portfolios SET
      status         = 'live',
      deployment_url = ${deploymentUrl},
      vercel_project_id = COALESCE(${vercelProjectId ?? null}, vercel_project_id),
      updated_at     = now()
    WHERE id = ${id}
  `;
}

export async function updatePortfolioCode(id: string, sourceCodeKey: string): Promise<void> {
  await sql`UPDATE portfolios SET source_code_key = ${sourceCodeKey}, updated_at = now() WHERE id = ${id}`;
}

export async function updatePortfolioJsonAndCode(id: string, siteJson: unknown, sourceCodeKey: string): Promise<void> {
  await sql`
    UPDATE portfolios SET
      site_json       = ${JSON.stringify(siteJson)}::jsonb,
      source_code_key = ${sourceCodeKey},
      updated_at      = now()
    WHERE id = ${id}
  `;
}

export async function deletePortfolio(id: string, userId: string): Promise<void> {
  await sql`DELETE FROM portfolios WHERE id = ${id} AND user_id = ${userId}`;
}

// ── Featured / Communauté ────────────────────────────────────────────────────

export async function getAllLivePortfoliosForAdmin(): Promise<Portfolio[]> {
  const rows = await sql`SELECT * FROM portfolios WHERE status = 'live' ORDER BY featured DESC, created_at DESC`;
  return many<Portfolio>(rows);
}

export async function setPortfolioFeatured(id: string, featured: boolean): Promise<void> {
  if (featured) {
    await sql`UPDATE portfolios SET featured = true, featured_at = now(), updated_at = now() WHERE id = ${id}`;
  } else {
    await sql`UPDATE portfolios SET featured = false, featured_at = null, updated_at = now() WHERE id = ${id}`;
  }
}

export async function getFeaturedPortfolios(): Promise<Portfolio[]> {
  const rows = await sql`SELECT * FROM portfolios WHERE featured = true AND status = 'live' ORDER BY featured_at DESC`;
  return many<Portfolio>(rows);
}

export async function getFeaturedPortfolioById(id: string): Promise<Portfolio | null> {
  const rows = await sql`SELECT * FROM portfolios WHERE id = ${id} AND featured = true AND status = 'live' LIMIT 1`;
  return one<Portfolio>(rows);
}

// ── Versions ────────────────────────────────────────────────────────────────

export async function getVersionsByPortfolio(portfolioId: string): Promise<PortfolioVersion[]> {
  const rows = await sql`
    SELECT * FROM portfolio_versions WHERE portfolio_id = ${portfolioId}
    ORDER BY version_num DESC LIMIT 8
  `;
  return many<PortfolioVersion>(rows);
}

export async function getLatestVersionNum(portfolioId: string): Promise<number> {
  const rows = await sql`
    SELECT version_num FROM portfolio_versions
    WHERE portfolio_id = ${portfolioId}
    ORDER BY version_num DESC LIMIT 1
  `;
  return one<{ version_num: number }>(rows)?.version_num ?? 0;
}

export async function createVersion(data: {
  portfolio_id: string;
  version_num: number;
  source_code_key: string;
  edit_summary?: string;
}): Promise<PortfolioVersion> {
  const rows = await sql`
    INSERT INTO portfolio_versions (portfolio_id, version_num, source_code_key, edit_summary)
    VALUES (${data.portfolio_id}, ${data.version_num}, ${data.source_code_key}, ${data.edit_summary ?? null})
    RETURNING *
  `;
  return many<PortfolioVersion>(rows)[0];
}

// Sauvegarde complète (site_json + code) avant une modification — filet de
// sécurité pour revenir en arrière si une édition IA casse le design.
// Numérote automatiquement et ne garde que les 8 versions les plus récentes.
export async function snapshotVersion(data: {
  portfolio_id: string;
  site_json: unknown;
  source_code_key: string | null;
  edit_summary: string;
}): Promise<void> {
  const nextNum = (await getLatestVersionNum(data.portfolio_id)) + 1;
  await sql`
    INSERT INTO portfolio_versions (portfolio_id, version_num, source_code_key, site_json, edit_summary)
    VALUES (${data.portfolio_id}, ${nextNum}, ${data.source_code_key ?? ""}, ${JSON.stringify(data.site_json)}::jsonb, ${data.edit_summary})
  `;
  // Purge au-delà de 8 versions
  await sql`
    DELETE FROM portfolio_versions
    WHERE portfolio_id = ${data.portfolio_id}
    AND version_num NOT IN (
      SELECT version_num FROM portfolio_versions
      WHERE portfolio_id = ${data.portfolio_id}
      ORDER BY version_num DESC LIMIT 8
    )
  `;
}

export async function pruneOldVersions(portfolioId: string): Promise<void> {
  await sql`
    DELETE FROM portfolio_versions
    WHERE portfolio_id = ${portfolioId}
    AND version_num NOT IN (
      SELECT version_num FROM portfolio_versions
      WHERE portfolio_id = ${portfolioId}
      ORDER BY version_num DESC LIMIT 5
    )
  `;
}

export async function getVersionById(id: string, portfolioId: string): Promise<PortfolioVersion | null> {
  const rows = await sql`
    SELECT * FROM portfolio_versions WHERE id = ${id} AND portfolio_id = ${portfolioId} LIMIT 1
  `;
  return one<PortfolioVersion>(rows);
}

// ── Edits ────────────────────────────────────────────────────────────────────

export async function createEdit(data: { portfolio_id: string; instruction: string }): Promise<PortfolioEdit> {
  const rows = await sql`
    INSERT INTO portfolio_edits (portfolio_id, instruction, status)
    VALUES (${data.portfolio_id}, ${data.instruction}, 'pending')
    RETURNING *
  `;
  return many<PortfolioEdit>(rows)[0];
}

export async function resolveEdit(id: string, status: "applied" | "failed", data: {
  diffApplied?: unknown;
  errorMessage?: string;
}): Promise<void> {
  await sql`
    UPDATE portfolio_edits SET
      status        = ${status},
      diff_applied  = ${data.diffApplied ? JSON.stringify(data.diffApplied) : null}::jsonb,
      error_message = ${data.errorMessage ?? null}
    WHERE id = ${id}
  `;
}

export async function getEditsByPortfolio(portfolioId: string): Promise<PortfolioEdit[]> {
  const rows = await sql`
    SELECT * FROM portfolio_edits WHERE portfolio_id = ${portfolioId}
    ORDER BY created_at DESC LIMIT 50
  `;
  return many<PortfolioEdit>(rows);
}

export async function getRecentAppliedEdits(portfolioId: string, limit = 4): Promise<{ instruction: string; summary: string }[]> {
  const rows = await sql`
    SELECT instruction, diff_applied
    FROM portfolio_edits
    WHERE portfolio_id = ${portfolioId} AND status = 'applied'
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;
  return many<{ instruction: string; diff_applied: { summary?: string; diffApplied?: string } | null }>(rows)
    .map((r) => ({
      instruction: r.instruction,
      summary: r.diff_applied?.summary ?? r.diff_applied?.diffApplied ?? r.instruction,
    }))
    .reverse();
}
