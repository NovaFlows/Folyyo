import { sql } from "./client";
import type { Portfolio, PortfolioVersion, PortfolioEdit, PortfolioWithOwnerAccess, UserSettings, SubscriptionStatus } from "@/types";
import { classifyReferrer, getSourceLabels, type ViewSource } from "@/lib/tracking/referrer-source";
import type { Locale } from "@/lib/i18n/types";

// `sql` (Neon) renvoie des lignes génériques — ces deux helpers centralisent
// le cast vers les types de domaine pour ne plus le répéter à chaque requête
// (c'était `as unknown as X[]` dupliqué ~16 fois dans ce fichier).
function many<T>(rows: unknown[]): T[] {
  return rows as T[];
}
function one<T>(rows: unknown[]): T | null {
  return many<T>(rows)[0] ?? null;
}

// ── Préférences de compte (pays/langue — demandés une fois à l'onboarding,
//    modifiables depuis les paramètres) ─────────────────────────────────────

export async function getUserSettings(userId: string): Promise<UserSettings | null> {
  const rows = await sql`SELECT * FROM users WHERE user_id = ${userId} LIMIT 1`;
  return one<UserSettings>(rows);
}

export async function upsertUserSettings(userId: string, data: { country?: string | null; language?: "fr" | "en" }): Promise<UserSettings> {
  const rows = await sql`
    INSERT INTO users (user_id, country, language)
    VALUES (${userId}, ${data.country ?? null}, ${data.language ?? "fr"})
    ON CONFLICT (user_id) DO UPDATE SET
      country    = COALESCE(${data.country ?? null}, users.country),
      language   = COALESCE(${data.language ?? null}, users.language),
      updated_at = now()
    RETURNING *
  `;
  return many<UserSettings>(rows)[0];
}

// ── Teaser CV public (landing page, sans compte) ────────────────────────────

export async function countRecentTeaserRequests(ip: string, sinceHours: number): Promise<number> {
  const rows = await sql`
    SELECT COUNT(*)::int AS count FROM teaser_requests
    WHERE ip = ${ip} AND created_at > now() - (${sinceHours} || ' hours')::interval
  `;
  return one<{ count: number }>(rows)?.count ?? 0;
}

export async function logTeaserRequest(ip: string): Promise<void> {
  await sql`INSERT INTO teaser_requests (ip) VALUES (${ip})`;
}

// ── Vues des portfolios déployés ─────────────────────────────────────────────

// Un visitor_id (cookie posé par le middleware) ne compte qu'une vue par
// portfolio et par jour — sinon un simple rafraîchissement de page gonfle le
// compteur. Sans visitor_id (cookies bloqués), la vue est comptée sans dédup.
export async function logPortfolioView(portfolioId: string, referrer: string | null, visitorId: string | null): Promise<void> {
  await sql`
    INSERT INTO portfolio_views (portfolio_id, referrer, visitor_id)
    VALUES (${portfolioId}, ${referrer}, ${visitorId})
    ON CONFLICT (portfolio_id, visitor_id, view_date) WHERE visitor_id IS NOT NULL DO NOTHING
  `;
}

export interface ViewCounts { total: number; last7d: number }

export async function getViewCountsForUser(userId: string): Promise<Record<string, ViewCounts>> {
  const rows = await sql`
    SELECT
      pv.portfolio_id::text AS portfolio_id,
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE pv.created_at > now() - interval '7 days')::int AS last7d
    FROM portfolio_views pv
    JOIN portfolios p ON p.id = pv.portfolio_id
    WHERE p.user_id = ${userId}
    GROUP BY pv.portfolio_id
  `;
  const result: Record<string, ViewCounts> = {};
  for (const row of many<{ portfolio_id: string; total: number; last7d: number }>(rows)) {
    result[row.portfolio_id] = { total: row.total, last7d: row.last7d };
  }
  return result;
}

export interface ViewSourceCount { source: ViewSource; label: string; count: number }

// Répartition des vues par provenance (Instagram, Facebook, LinkedIn,
// Twitter/X, communauté Folyyo, autre) — classifiée en JS à partir du
// referrer brut déjà stocké, pas de tracking supplémentaire.
export async function getViewSourcesForPortfolio(portfolioId: string, locale: Locale): Promise<ViewSourceCount[]> {
  const rows = await sql`
    SELECT referrer, COUNT(*)::int AS count
    FROM portfolio_views
    WHERE portfolio_id = ${portfolioId}
    GROUP BY referrer
  `;
  const totals: Partial<Record<ViewSource, number>> = {};
  for (const row of many<{ referrer: string | null; count: number }>(rows)) {
    const source = classifyReferrer(row.referrer);
    totals[source] = (totals[source] ?? 0) + row.count;
  }
  const labels = getSourceLabels(locale);
  return (Object.entries(totals) as [ViewSource, number][])
    .map(([source, count]) => ({ source, label: labels[source], count }))
    .sort((a, b) => b.count - a.count);
}

// ── État de fraîcheur GitHub/YouTube ────────────────────────────────────────

export interface SyncState {
  portfolio_id: string;
  known_repo_ids: number[] | null;
  known_video_ids: string[] | null;
  last_checked_at: string;
}

export async function getSyncState(portfolioId: string): Promise<SyncState | null> {
  const rows = await sql`SELECT * FROM content_sync_state WHERE portfolio_id = ${portfolioId}`;
  return one<SyncState>(rows);
}

export async function upsertSyncState(
  portfolioId: string,
  data: { knownRepoIds: number[]; knownVideoIds: string[] },
): Promise<void> {
  await sql`
    INSERT INTO content_sync_state (portfolio_id, known_repo_ids, known_video_ids, last_checked_at)
    VALUES (${portfolioId}, ${JSON.stringify(data.knownRepoIds)}, ${JSON.stringify(data.knownVideoIds)}, now())
    ON CONFLICT (portfolio_id) DO UPDATE
    SET known_repo_ids = EXCLUDED.known_repo_ids, known_video_ids = EXCLUDED.known_video_ids, last_checked_at = now()
  `;
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
  country?: string;
  language?: "fr" | "en";
}): Promise<Portfolio> {
  const rows = await sql`
    INSERT INTO portfolios (user_id, name, profile_type, status, slug, country, language)
    VALUES (${data.user_id}, ${data.name}, ${data.profile_type}, 'generating', ${data.slug ?? null}, ${data.country ?? null}, ${data.language ?? "fr"})
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

// `p.*` (jamais `SELECT *` avec la jointure) : portfolios ET users ont
// chacune leurs propres colonnes country/language/created_at/updated_at —
// un `SELECT *` global les rendrait ambiguës et écraserait silencieusement
// les valeurs du portfolio par celles du compte.
export async function getPortfolioBySlugPublic(slugOrId: string): Promise<PortfolioWithOwnerAccess | null> {
  const rows = await sql`
    SELECT p.*, u.subscription_status AS owner_subscription_status, u.trial_ends_at AS owner_trial_ends_at
    FROM portfolios p
    LEFT JOIN users u ON u.user_id = p.user_id
    WHERE p.slug = ${slugOrId} OR p.id::text = ${slugOrId}
    LIMIT 1
  `;
  return one<PortfolioWithOwnerAccess>(rows);
}

export async function setPortfolioStatus(id: string, status: string): Promise<void> {
  await sql`UPDATE portfolios SET status = ${status}, updated_at = now() WHERE id = ${id}`;
}

export async function setPortfolioError(id: string, message: string): Promise<void> {
  // Free the slug so the user can retry with the same slug
  await sql`UPDATE portfolios SET status = 'error', slug = null, error_message = ${message}, updated_at = now() WHERE id = ${id}`;
}

// Portfolio "en ligne" dès que site_json/le code existent — /[slug] le rend
// immédiatement, aucune étape de déploiement séparée n'est requise.
export async function setPortfolioReady(id: string, data: {
  siteJson: unknown;
  inputData: unknown;
  sourceCodeKey: string;
}): Promise<void> {
  await sql`
    UPDATE portfolios SET
      status          = 'live',
      site_json       = ${JSON.stringify(data.siteJson)}::jsonb,
      input_data      = ${JSON.stringify(data.inputData)}::jsonb,
      source_code_key = ${data.sourceCodeKey},
      updated_at      = now()
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

// Suppression de compte : retire tout ce qui appartient à l'utilisateur avant
// que le compte Clerk lui-même ne soit supprimé, pour ne pas laisser de
// portfolios orphelins (encore visibles publiquement, plus jamais gérables).
export async function deleteAllPortfoliosForUser(userId: string): Promise<void> {
  await sql`DELETE FROM portfolios WHERE user_id = ${userId}`;
}

export async function deleteUserSettings(userId: string): Promise<void> {
  await sql`DELETE FROM users WHERE user_id = ${userId}`;
}

// ── Abonnement (essai 7 jours puis Stripe) — voir lib/billing/access.ts ─────

export async function setSubscriptionActive(userId: string, data: {
  stripeCustomerId: string; stripeSubscriptionId: string; stripePriceId: string; currentPeriodEnd: Date;
}): Promise<void> {
  await sql`
    UPDATE users SET
      subscription_status = 'active',
      stripe_customer_id = ${data.stripeCustomerId},
      stripe_subscription_id = ${data.stripeSubscriptionId},
      stripe_price_id = ${data.stripePriceId},
      subscription_current_period_end = ${data.currentPeriodEnd.toISOString()},
      updated_at = now()
    WHERE user_id = ${userId}
  `;
}

// Utilisé par les webhooks Stripe (customer.subscription.*), qui ne portent
// que l'id client Stripe — jamais le user_id Clerk directement.
export async function setSubscriptionStatusByCustomerId(
  stripeCustomerId: string,
  status: SubscriptionStatus,
  extra?: { stripeSubscriptionId?: string; stripePriceId?: string; currentPeriodEnd?: Date },
): Promise<void> {
  await sql`
    UPDATE users SET
      subscription_status = ${status},
      stripe_subscription_id = COALESCE(${extra?.stripeSubscriptionId ?? null}, stripe_subscription_id),
      stripe_price_id = COALESCE(${extra?.stripePriceId ?? null}, stripe_price_id),
      subscription_current_period_end = COALESCE(${extra?.currentPeriodEnd?.toISOString() ?? null}, subscription_current_period_end),
      updated_at = now()
    WHERE stripe_customer_id = ${stripeCustomerId}
  `;
}

export async function getUserSettingsByStripeCustomerId(stripeCustomerId: string): Promise<UserSettings | null> {
  const rows = await sql`SELECT * FROM users WHERE stripe_customer_id = ${stripeCustomerId} LIMIT 1`;
  return one<UserSettings>(rows);
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

// ── Support (dashboard → admin, jamais un mailto) ───────────────────────────
export interface SupportMessage {
  id: string; user_id: string; email: string; category: string; message: string;
  status: string; created_at: string;
}

export async function createSupportMessage(data: {
  user_id: string; email: string; category: string; message: string;
}): Promise<SupportMessage> {
  const rows = await sql`
    INSERT INTO support_messages (user_id, email, category, message)
    VALUES (${data.user_id}, ${data.email}, ${data.category}, ${data.message})
    RETURNING *
  `;
  return many<SupportMessage>(rows)[0];
}

export async function getSupportMessages(): Promise<SupportMessage[]> {
  const rows = await sql`SELECT * FROM support_messages ORDER BY created_at DESC`;
  return many<SupportMessage>(rows);
}

export async function setSupportMessageStatus(id: string, status: "new" | "resolved"): Promise<void> {
  await sql`UPDATE support_messages SET status = ${status} WHERE id = ${id}`;
}
