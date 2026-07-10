import { sql } from "./client";
import type { Portfolio, PortfolioVersion, PortfolioEdit } from "@/types";

// ── Portfolios ─────────────────────────────────────────────────────────────

export async function getPortfoliosByUser(userId: string): Promise<Portfolio[]> {
  const rows = await sql`SELECT * FROM portfolios WHERE user_id = ${userId} ORDER BY created_at DESC`;
  return rows as unknown as Portfolio[];
}

export async function getPortfolioById(id: string, userId: string): Promise<Portfolio | null> {
  const rows = await sql`SELECT * FROM portfolios WHERE id = ${id} AND user_id = ${userId} LIMIT 1`;
  return (rows as unknown as Portfolio[])[0] ?? null;
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
  return (rows as unknown as Portfolio[])[0];
}

export async function getPortfolioBySlugOrId(slugOrId: string, userId: string): Promise<Portfolio | null> {
  const rows = await sql`
    SELECT * FROM portfolios
    WHERE (slug = ${slugOrId} OR id::text = ${slugOrId}) AND user_id = ${userId}
    LIMIT 1
  `;
  return (rows as unknown as Portfolio[])[0] ?? null;
}

export async function getPortfolioBySlugPublic(slugOrId: string): Promise<Portfolio | null> {
  const rows = await sql`
    SELECT * FROM portfolios
    WHERE slug = ${slugOrId} OR id::text = ${slugOrId}
    LIMIT 1
  `;
  return (rows as unknown as Portfolio[])[0] ?? null;
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

// ── Versions ────────────────────────────────────────────────────────────────

export async function getVersionsByPortfolio(portfolioId: string): Promise<PortfolioVersion[]> {
  const rows = await sql`
    SELECT * FROM portfolio_versions WHERE portfolio_id = ${portfolioId}
    ORDER BY version_num DESC LIMIT 5
  `;
  return rows as unknown as PortfolioVersion[];
}

export async function getLatestVersionNum(portfolioId: string): Promise<number> {
  const rows = await sql`
    SELECT version_num FROM portfolio_versions
    WHERE portfolio_id = ${portfolioId}
    ORDER BY version_num DESC LIMIT 1
  `;
  return ((rows as unknown as { version_num: number }[])[0]?.version_num ?? 0);
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
  return (rows as unknown as PortfolioVersion[])[0];
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
  return (rows as unknown as PortfolioVersion[])[0] ?? null;
}

// ── Edits ────────────────────────────────────────────────────────────────────

export async function createEdit(data: { portfolio_id: string; instruction: string }): Promise<PortfolioEdit> {
  const rows = await sql`
    INSERT INTO portfolio_edits (portfolio_id, instruction, status)
    VALUES (${data.portfolio_id}, ${data.instruction}, 'pending')
    RETURNING *
  `;
  return (rows as unknown as PortfolioEdit[])[0];
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
  return rows as unknown as PortfolioEdit[];
}

export async function getRecentAppliedEdits(portfolioId: string, limit = 4): Promise<{ instruction: string; summary: string }[]> {
  const rows = await sql`
    SELECT instruction, diff_applied
    FROM portfolio_edits
    WHERE portfolio_id = ${portfolioId} AND status = 'applied'
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;
  return (rows as unknown as { instruction: string; diff_applied: { summary?: string; diffApplied?: string } | null }[])
    .map((r) => ({
      instruction: r.instruction,
      summary: r.diff_applied?.summary ?? r.diff_applied?.diffApplied ?? r.instruction,
    }))
    .reverse();
}
