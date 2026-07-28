import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getUserSettings, countPortfoliosByUser } from "@/lib/db/queries";
import DashboardNav from "./DashboardNav";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();
  if (!userId) redirect("/login");

  const locale = getLocale();
  const t = getDictionary(locale).dashboardNav;

  // Un portfolio par compte, sauf les comptes "lifetime" — voir
  // app/api/portfolio/generate/route.ts pour la garde serveur équivalente.
  const [settings, portfolioCount] = await Promise.all([getUserSettings(userId), countPortfoliosByUser(userId)]);
  const canCreateMore = settings?.subscription_status === "lifetime" || portfolioCount === 0;
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
