-- Run this once on your Neon project to initialize the schema

-- Préférences de compte (pas de table Clerk locale — juste ce qu'on a besoin
-- de retenir en plus de l'identité). Pays demandé une seule fois, à la
-- création du compte (première visite de l'onboarding), modifiable ensuite
-- depuis les paramètres — d'où le stockage au niveau du compte plutôt que du
-- portfolio.
CREATE TABLE IF NOT EXISTS users (
  user_id     TEXT        PRIMARY KEY,
  country     TEXT,
  language    TEXT        NOT NULL DEFAULT 'fr',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Abonnement (essai 3 jours puis Stripe) — voir lib/billing/access.ts.
  -- 'lifetime' = accès permanent gratuit accordé manuellement (comptes
  -- historiques au moment du lancement de cette fonctionnalité), jamais posé
  -- par le code applicatif lui-même.
  subscription_status TEXT NOT NULL DEFAULT 'trialing', -- trialing | active | lifetime | canceled | past_due
  trial_ends_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '3 days'),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  stripe_price_id TEXT,
  subscription_current_period_end TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS portfolios (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          TEXT        NOT NULL,
  name             TEXT        NOT NULL DEFAULT 'Mon Portfolio',
  profile_type     TEXT        NOT NULL DEFAULT 'developer',
  status           TEXT        NOT NULL DEFAULT 'draft',
  site_json        JSONB,
  input_data       JSONB,
  slug             TEXT,
  featured         BOOLEAN     NOT NULL DEFAULT false,
  featured_at      TIMESTAMPTZ,
  source_code_key  TEXT,
  vercel_project_id  TEXT,
  vercel_deployment_id TEXT,
  deployment_url   TEXT,
  custom_domain    TEXT,
  error_message    TEXT,
  country          TEXT,
  language         TEXT        NOT NULL DEFAULT 'fr',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- NOTE: `slug`, `featured` et `featured_at` ont ete ajoutes en prod via des
-- ALTER TABLE ad-hoc (pas de systeme de migration dans ce repo) — ce fichier
-- ne sert que de reference pour bootstrap une nouvelle DB.

CREATE INDEX IF NOT EXISTS idx_portfolios_user_id    ON portfolios(user_id);
CREATE INDEX IF NOT EXISTS idx_portfolios_created_at ON portfolios(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_portfolios_featured    ON portfolios(featured) WHERE featured = true;

CREATE TABLE IF NOT EXISTS portfolio_versions (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id     UUID        NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
  version_num      INT         NOT NULL,
  source_code_key  TEXT        NOT NULL,
  site_json        JSONB,
  edit_summary     TEXT,
  deployment_url   TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(portfolio_id, version_num)
);
-- NOTE: `site_json` ajouté via ALTER TABLE en prod (snapshot avant édition IA).

CREATE INDEX IF NOT EXISTS idx_portfolio_versions_portfolio_id ON portfolio_versions(portfolio_id);

CREATE TABLE IF NOT EXISTS portfolio_edits (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id   UUID        NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
  instruction    TEXT        NOT NULL,
  status         TEXT        NOT NULL DEFAULT 'pending',
  diff_applied   JSONB,
  error_message  TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_portfolio_edits_portfolio_id ON portfolio_edits(portfolio_id);

-- Log des tentatives du teaser CV public (landing page, sans compte) — une
-- ligne par requête, pas de compteur stateful, pour un rate limiting simple
-- par IP sans risque de race condition d'UPSERT.
CREATE TABLE IF NOT EXISTS teaser_requests (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  ip         TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_teaser_requests_ip_created ON teaser_requests(ip, created_at DESC);

-- Log des vues d'un portfolio (loggé côté serveur au rendu de app/[slug]/page.tsx)
-- — une ligne par vue. visitor_id vient d'un cookie anonyme (pf_vid, posé par
-- middleware.ts, aucune donnée personnelle) qui dédoublonne à une vue par
-- portfolio et par jour, pour qu'un simple rafraîchissement de page ne gonfle
-- pas le compteur.
CREATE TABLE IF NOT EXISTS portfolio_views (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id UUID        NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
  referrer     TEXT,
  visitor_id   TEXT,
  view_date    DATE        NOT NULL DEFAULT CURRENT_DATE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_portfolio_views_portfolio_created ON portfolio_views(portfolio_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_portfolio_views_dedup
  ON portfolio_views(portfolio_id, visitor_id, view_date) WHERE visitor_id IS NOT NULL;

-- État de la dernière vérification de fraîcheur GitHub/YouTube d'un portfolio
-- (nudge dashboard "N nouveaux repos/vidéos depuis ta dernière visite") — un
-- seul état par portfolio, mis à jour à chaque check (throttlé côté code).
CREATE TABLE IF NOT EXISTS content_sync_state (
  portfolio_id     UUID        PRIMARY KEY REFERENCES portfolios(id) ON DELETE CASCADE,
  known_repo_ids   JSONB,
  known_video_ids  JSONB,
  last_checked_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Messages de support envoyés depuis le dashboard (problème/suggestion/autre)
-- — jamais un mailto, reste dans l'app ; consultés côté admin sur
-- /dashboard/admin/support. `email` est capturé côté serveur (Clerk) au
-- moment de l'envoi plutôt que joint via user_id à chaque lecture — reste
-- correct même si la personne change d'email plus tard.
CREATE TABLE IF NOT EXISTS support_messages (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    TEXT        NOT NULL,
  email      TEXT        NOT NULL,
  category   TEXT        NOT NULL DEFAULT 'other',
  message    TEXT        NOT NULL,
  status     TEXT        NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_messages_created_at ON support_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_messages_status     ON support_messages(status);
