export type PortfolioStatus = "draft" | "generating" | "deploying" | "live" | "error" | "editing";

// 'lifetime' = accès permanent gratuit accordé manuellement (jamais posé par
// le code applicatif) — voir lib/billing/access.ts.
export type SubscriptionStatus = "trialing" | "active" | "lifetime" | "canceled" | "past_due";

export type UserSettings = {
  user_id: string;
  country: string | null;
  language: "fr" | "en" | "es";
  created_at: string;
  updated_at: string;
  subscription_status: SubscriptionStatus;
  trial_ends_at: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  subscription_current_period_end: string | null;
};

export type Portfolio = {
  id: string;
  user_id: string;
  name: string;
  profile_type: "developer" | "artist" | "fashion" | "musicien" | "other";
  status: PortfolioStatus;
  site_json: unknown;
  input_data: unknown;
  slug: string | null;
  featured: boolean;
  featured_at: string | null;
  source_code_key: string | null;
  vercel_project_id: string | null;
  vercel_deployment_id: string | null;
  deployment_url: string | null;
  custom_domain: string | null;
  error_message: string | null;
  country: string | null;
  language: "fr" | "en" | "es";
  created_at: string;
  updated_at: string;
};

// Portfolio public + statut d'abonnement du propriétaire, en une seule
// requête (LEFT JOIN dans getPortfolioBySlugPublic) — évite un aller-retour
// séparé sur le chemin public (rendu à chaque visite, déjà sensible à la
// latence à cause du suivi de vues).
export type PortfolioWithOwnerAccess = Portfolio & {
  owner_subscription_status: SubscriptionStatus;
  owner_trial_ends_at: string;
};

export type PortfolioVersion = {
  id: string;
  portfolio_id: string;
  version_num: number;
  source_code_key: string;
  site_json: unknown;
  edit_summary: string | null;
  deployment_url: string | null;
  created_at: string;
};

export type PortfolioEdit = {
  id: string;
  portfolio_id: string;
  instruction: string;
  status: "pending" | "applied" | "failed";
  diff_applied: unknown;
  error_message: string | null;
  created_at: string;
};
