import { getDictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/types";
import { getUserSettings, countPortfoliosByUser } from "@/lib/db/queries";
import { isAdmin } from "@/lib/auth/admin";
import DashboardNav from "./DashboardNav";

// Habillage du dashboard (fond + nav + conteneur centré), extrait de layout.tsx
// pour être réutilisable tel quel par la route de capture locale
// (app/shot/dashboard), qui ne peut pas dépendre du layout — celui-ci fait de
// l'auth Clerk. L'auth reste à la charge de l'appelant.
export default async function DashboardShell({ userId, locale, children }: {
  userId: string;
  locale: Locale;
  children: React.ReactNode;
}) {
  const t = getDictionary(locale).dashboardNav;

  // Un portfolio par compte, sauf les comptes "lifetime" — voir
  // app/api/portfolio/generate/route.ts pour la garde serveur équivalente.
  const [settings, portfolioCount] = await Promise.all([getUserSettings(userId), countPortfoliosByUser(userId)]);
  const canCreateMore = isAdmin(userId) || settings?.subscription_status === "lifetime" || portfolioCount === 0;
  const myPortfoliosLabel = portfolioCount === 1 ? t.myPortfolio : t.myPortfolios;

  return (
    <div className="min-h-screen" style={{ background: "#f8f5f0" }}>
      <header style={{ background: "#f8f5f0", borderBottom: "1px solid rgba(0,0,0,0.07)" }}>
        <DashboardNav
          locale={locale}
          canCreateMore={canCreateMore}
          labels={{
            myPortfolios: myPortfoliosLabel,
            community: t.community,
            settings: t.settings,
            billing: t.billing,
            support: t.support,
            newPortfolio: t.newPortfolio,
            newPortfolioShort: t.newPortfolioShort,
            logout: t.logout,
          }}
        />
      </header>
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">{children}</div>
    </div>
  );
}
