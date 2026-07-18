import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { SignOutButton } from "@clerk/nextjs";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();
  if (!userId) redirect("/login");

  return (
    <div className="min-h-screen" style={{ background: "#f8f5f0" }}>
      <header style={{ background: "#f8f5f0", borderBottom: "1px solid rgba(0,0,0,0.07)" }}>
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3 sm:px-6 sm:py-4">
          <Link href="/dashboard" style={{ fontFamily: "'Playfair Display', Georgia, serif", color: "#1c1917", fontSize: "1.25rem", fontWeight: 500 }}>
            folyyo
          </Link>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 sm:gap-5">
            <Link href="/dashboard"
              className="text-sm font-medium transition hover:opacity-70"
              style={{ color: "#78716c" }}>
              Mes portfolios
            </Link>
            <Link href="/community"
              className="text-sm font-medium transition hover:opacity-70"
              style={{ color: "#78716c" }}>
              Communauté
            </Link>
            <Link href="/onboarding"
              className="rounded-full px-4 py-2 text-sm font-medium text-white transition hover:opacity-80 sm:px-5"
              style={{ background: "#1c1917" }}>
              <span className="sm:hidden">+ Nouveau</span>
              <span className="hidden sm:inline">+ Nouveau portfolio</span>
            </Link>
            <SignOutButton redirectUrl="/">
              <button className="text-sm transition hover:opacity-60" style={{ color: "#a09a94" }}>
                Déconnexion
              </button>
            </SignOutButton>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">{children}</div>
    </div>
  );
}
