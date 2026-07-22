import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { SignOutButton } from "@clerk/nextjs";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";
import LanguageToggle from "@/components/i18n/LanguageToggle";
import { getUserSettings, hasAnyPortfolio } from "@/lib/db/queries";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();
  if (!userId) redirect("/login");

  const locale = getLocale();
  const t = getDictionary(locale).dashboardNav;

  // Un portfolio par compte, sauf les comptes "lifetime" — voir
  // app/api/portfolio/generate/route.ts pour la garde serveur équivalente.
  const settings = await getUserSettings(userId);
  const canCreateMore = settings?.subscription_status === "lifetime" || !(await hasAnyPortfolio(userId));

  return (
    <div className="min-h-screen" style={{ background: "#f8f5f0" }}>
      <header style={{ background: "#f8f5f0", borderBottom: "1px solid rgba(0,0,0,0.07)" }}>
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3 sm:px-6 sm:py-4">
          <Link href="/dashboard" style={{ fontFamily: "'Playfair Display', Georgia, serif", color: "#1c1917", fontSize: "1.25rem", fontWeight: 500 }}>
            folyo
          </Link>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 sm:gap-5">
            <Link href="/dashboard"
              className="nav-link text-sm font-medium transition hover:opacity-70"
              style={{ color: "#78716c" }}>
              {t.myPortfolios}
            </Link>
            <Link href="/community"
              className="nav-link text-sm font-medium transition hover:opacity-70"
              style={{ color: "#78716c" }}>
              {t.community}
            </Link>
            <Link href="/settings"
              className="nav-link text-sm font-medium transition hover:opacity-70"
              style={{ color: "#78716c" }}>
              {t.settings}
            </Link>
            <Link href="/billing"
              className="nav-link text-sm font-medium transition hover:opacity-70"
              style={{ color: "#78716c" }}>
              {t.billing}
            </Link>
            <Link href="/support"
              className="nav-link text-sm font-medium transition hover:opacity-70"
              style={{ color: "#78716c" }}>
              {t.support}
            </Link>
            <LanguageToggle locale={locale} />
            {canCreateMore && (
              <Link href="/onboarding"
                className="rounded-full px-4 py-2 text-sm font-medium text-white transition hover:opacity-80 sm:px-5"
                style={{ background: "#1c1917" }}>
                <span className="sm:hidden">{t.newPortfolioShort}</span>
                <span className="hidden sm:inline">{t.newPortfolio}</span>
              </Link>
            )}
            <SignOutButton redirectUrl="/">
              <button className="text-sm transition hover:opacity-60" style={{ color: "#a09a94" }}>
                {t.logout}
              </button>
            </SignOutButton>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">{children}</div>
    </div>
  );
}
