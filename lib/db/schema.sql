-- Run this once on your Neon project to initialize the schema

CREATE TABLE IF NOT EXISTS portfolios (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          TEXT        NOT NULL,
  name             TEXT        NOT NULL DEFAULT 'Mon Portfolio',
  profile_type     TEXT        NOT NULL DEFAULT 'developer',
  status           TEXT        NOT NULL DEFAULT 'draft',
  site_json        JSONB,
  input_data       JSONB,
  source_code_key  TEXT,
  vercel_project_id  TEXT,
  vercel_deployment_id TEXT,
  deployment_url   TEXT,
  custom_domain    TEXT,
  error_message    TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_portfolios_user_id    ON portfolios(user_id);
CREATE INDEX IF NOT EXISTS idx_portfolios_created_at ON portfolios(created_at DESC);

CREATE TABLE IF NOT EXISTS portfolio_versions (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id     UUID        NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
  version_num      INT         NOT NULL,
  source_code_key  TEXT        NOT NULL,
  edit_summary     TEXT,
  deployment_url   TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(portfolio_id, version_num)
);

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
