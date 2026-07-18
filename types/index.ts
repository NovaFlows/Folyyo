export type PortfolioStatus = "draft" | "generating" | "deploying" | "live" | "error" | "editing";

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
  created_at: string;
  updated_at: string;
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
