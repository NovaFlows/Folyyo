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

export async function upsertUserSettings(userId: string, data: { country?: string | null; language?: "fr" | "en" | "es" | "de" }): Promise<UserSettings> {
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

// Accorde l'accès "lifetime" à un compte — utilisé pour le compte showcase/admin
// qui héberge les portfolios de démo de la Communauté : sans accès actif, leurs
// pages publiques seraient mises en pause (voir app/[slug]/page.tsx). La ligne
// users doit déjà exister (upsertUserSettings au préalable).
export async function grantLifetimeAccess(userId: string): Promise<void> {
  await sql`UPDATE users SET subscription_status = 'lifetime', updated_at = now() WHERE user_id = ${userId}`;
}

// ── Séquence e-mail d'essai (J0 à la génération + relance/J3 via le cron
//    app/api/cron/trial-emails) — voir lib/email/notify.ts. Une colonne par
//    e-mail, jamais renvoyé une fois posée (idempotence).
export async function markTrialEmailJ0Sent(userId: string): Promise<void> {
  await sql`UPDATE users SET trial_email_j0_sent_at = now() WHERE user_id = ${userId}`;
}
export async function markTrialEmailRelanceSent(userId: string): Promise<void> {
  await sql`UPDATE users SET trial_email_relance_sent_at = now() WHERE user_id = ${userId}`;
}
export async function markTrialEmailJ3Sent(userId: string): Promise<void> {
  await sql`UPDATE users SET trial_email_j3_sent_at = now() WHERE user_id = ${userId}`;
}

export interface TrialEmailCandidate {
  user_id: string;
  language: "fr" | "en" | "es" | "de";
  trial_ends_at: string;
  trial_email_relance_sent_at: string | null;
  trial_email_j3_sent_at: string | null;
  slug: string;
  views: number;
}

// Comptes en essai avec un portfolio déjà en ligne, candidats à la relance
// (J1-J2) ou à l'e-mail d'urgence (dernier jour) — le cron décide lequel
// envoyer selon `trial_ends_at`. Le J0 (à la génération) est déclenché
// directement depuis /api/portfolio/generate, pas ici. On exclut les essais
// expirés depuis plus d'un jour : inutile de les rescanner indéfiniment.
export async function getTrialEmailCandidates(): Promise<TrialEmailCandidate[]> {
  const rows = await sql`
    SELECT u.user_id, u.language, u.trial_ends_at,
           u.trial_email_relance_sent_at, u.trial_email_j3_sent_at,
           p.slug,
           COALESCE(v.total, 0)::int AS views
    FROM users u
    JOIN portfolios p ON p.user_id = u.user_id AND p.status = 'live' AND p.slug IS NOT NULL
    LEFT JOIN (
      SELECT portfolio_id, COUNT(*)::int AS total FROM portfolio_views GROUP BY portfolio_id
    ) v ON v.portfolio_id = p.id
    WHERE u.subscription_status = 'trialing'
      AND u.trial_ends_at > now() - interval '1 day'
    ORDER BY u.trial_ends_at ASC
  `;
  return many<TrialEmailCandidate>(rows);
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
// Twitter/X, communauté Folyo, autre) — classifiée en JS à partir du
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

// Un portfolio par compte, sauf les comptes "lifetime" (comptes de test —
// voir hasActiveAccess/subscription_status) qui peuvent en créer autant
// qu'ils veulent. Utilisé à la création (garde serveur) et pour savoir si le
// bouton "+ Nouveau portfolio" doit s'afficher.
export async function hasAnyPortfolio(userId: string): Promise<boolean> {
  const rows = await sql`SELECT 1 FROM portfolios WHERE user_id = ${userId} LIMIT 1`;
  return rows.length > 0;
}

// Compte exact (pas juste "au moins un") — utilisé dans le layout dashboard
// pour choisir le libellé singulier/pluriel ("Mon portfolio" vs "Mes
// portfolios") sans devoir recharger la liste complète des portfolios.
export async function countPortfoliosByUser(userId: string): Promise<number> {
  const rows = await sql`SELECT COUNT(*)::int AS count FROM portfolios WHERE user_id = ${userId}`;
  return one<{ count: number }>(rows)?.count ?? 0;
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
  language?: "fr" | "en" | "es" | "de";
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

// ── Abonnement (essai 3 jours puis Stripe) — voir lib/billing/access.ts ─────

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

// Portfolios candidats au sitemap : en ligne, avec un slug, ET accompagnés de
// l'état d'abonnement de leur propriétaire.
//
// Ce dernier point est le but de la requête. Un portfolio dont le
// propriétaire n'a plus d'accès actif est rendu en `noindex` par
// app/[slug]/page.tsx ; le déclarer quand même au sitemap revient à demander à
// Google d'indexer une page qu'on lui interdit ensuite d'indexer — ce que la
// Search Console remonte comme une erreur. Le filtrage lui-même n'est PAS fait
// en SQL : il est laissé à `hasActiveAccess`, pour que le sitemap et la page
// appliquent forcément la même règle.
export type SitemapPortfolio = {
  slug: string | null;
  updated_at: string | null;
  owner_subscription_status: string | null;
  owner_trial_ends_at: string;
};
export async function getPortfoliosForSitemap(): Promise<SitemapPortfolio[]> {
  const rows = await sql`
    SELECT p.slug, p.updated_at,
           u.subscription_status AS owner_subscription_status,
           u.trial_ends_at       AS owner_trial_ends_at
    FROM portfolios p
    JOIN users u ON u.user_id = p.user_id
    WHERE p.status = 'live' AND p.slug IS NOT NULL`;
  return many<SitemapPortfolio>(rows);
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

// Anti-spam : borne le nombre de messages qu'un même compte peut envoyer par
// heure (aucune limite avant — un compte pouvait spammer indéfiniment l'email
// de l'exploitant via notifyNewSupportMessage, chaque appel déclenchant un envoi Resend).
// Compteur "portfolios créés" affiché sur la landing — voir COUNTER_BASELINE
// dans app/page.tsx : la vraie valeur DB au moment choisi par l'exploitant
// n'est jamais montrée telle quelle (elle inclut les portfolios de démo
// communauté) ; seuls les portfolios créés APRÈS ce point de départ
// s'additionnent au nombre affiché, qui grandit ensuite avec les vraies créations.
export async function countPortfoliosCreatedSince(since: Date): Promise<number> {
  const rows = await sql`SELECT COUNT(*)::int AS count FROM portfolios WHERE created_at >= ${since.toISOString()}`;
  return one<{ count: number }>(rows)?.count ?? 0;
}

export async function countRecentSupportMessages(userId: string, sinceHours: number): Promise<number> {
  const rows = await sql`
    SELECT COUNT(*)::int AS count FROM support_messages
    WHERE user_id = ${userId} AND created_at > now() - (${sinceHours} || ' hours')::interval
  `;
  return one<{ count: number }>(rows)?.count ?? 0;
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

// ── Avis clients (popup dashboard → admin) ──────────────────────────────────
export interface Review {
  id: string; user_id: string; email: string; rating: number; comment: string | null; created_at: string;
}

// Un seul avis par compte — vérifié avant d'afficher le popup ET avant
// insertion (la contrainte UNIQUE(user_id) protège en plus au niveau DB).
export async function hasUserReviewed(userId: string): Promise<boolean> {
  const rows = await sql`SELECT 1 FROM reviews WHERE user_id = ${userId} LIMIT 1`;
  return rows.length > 0;
}

// `ON CONFLICT DO NOTHING` : si l'utilisateur a déjà un avis (course entre
// deux requêtes, ou popup pas encore refermé côté client), on n'écrase jamais
// un avis existant — la route appelante doit vérifier hasUserReviewed avant
// et traiter un retour vide comme "déjà noté".
export async function createReview(data: {
  user_id: string; email: string; rating: number; comment?: string | null;
}): Promise<Review | null> {
  const rows = await sql`
    INSERT INTO reviews (user_id, email, rating, comment)
    VALUES (${data.user_id}, ${data.email}, ${data.rating}, ${data.comment ?? null})
    ON CONFLICT (user_id) DO NOTHING
    RETURNING *
  `;
  return one<Review>(rows);
}

export async function getReviews(): Promise<Review[]> {
  const rows = await sql`SELECT * FROM reviews ORDER BY created_at DESC`;
  return many<Review>(rows);
}
