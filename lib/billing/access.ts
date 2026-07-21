import type { UserSettings } from "@/types";

// Calcul d'accès centralisé — toujours à partir de la ligne `users` du
// PROPRIÉTAIRE d'un portfolio, jamais stocké sur `portfolios` lui-même : ça
// garantit que payer restaure l'accès instantanément, sur le même slug, sans
// devoir toucher aux portfolios existants.
export function hasActiveAccess(u: Pick<UserSettings, "subscription_status" | "trial_ends_at">): boolean {
  if (u.subscription_status === "active" || u.subscription_status === "lifetime") return true;
  if (u.subscription_status === "trialing") return new Date(u.trial_ends_at).getTime() > Date.now();
  return false; // canceled | past_due
}
