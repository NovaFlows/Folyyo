-- Run this once on your Neon project to initialize the schema

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

-- Log des vues d'un portfolio déployé (beacon envoyé par le site généré,
-- voir lib/portfolio/code-generator.ts) — une ligne par vue, pas de compteur
-- stateful. Volontairement sans IP ni cookie (vie privée par défaut, pas de
-- bandeau de consentement nécessaire).
CREATE TABLE IF NOT EXISTS portfolio_views (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id UUID        NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
  referrer     TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_portfolio_views_portfolio_created ON portfolio_views(portfolio_id, created_at DESC);
