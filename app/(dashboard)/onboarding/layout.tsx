import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getUserSettings, countPortfoliosByUser } from "@/lib/db/queries";
import { isAdmin } from "@/lib/auth/admin";

// Garde serveur de la route /onboarding : empêche de lancer la création d'un
// nouveau portfolio quand le compte n'y a pas droit (déjà un portfolio, hors
// comptes "lifetime"). Sans ça, un utilisateur pouvait taper /onboarding à la
// main, remplir tout le formulaire, et ne se heurter au refus (403) qu'au tout
// dernier moment côté API de génération — mauvaise UX. La règle est identique à
// celle du bouton « Nouveau portfolio » (app/(dashboard)/layout.tsx) et à la
// garde serveur de app/api/portfolio/generate/route.ts.
export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();
  if (!userId) redirect("/login");

  const [settings, portfolioCount] = await Promise.all([
    getUserSettings(userId),
    countPortfoliosByUser(userId),
  ]);
  const canCreate = isAdmin(userId) || settings?.subscription_status === "lifetime" || portfolioCount === 0;
  if (!canCreate) redirect("/dashboard");

  return <>{children}</>;
}
