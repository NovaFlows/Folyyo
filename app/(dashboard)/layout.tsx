import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { SignOutButton } from "@clerk/nextjs";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();
  if (!userId) redirect("/login");

  const user = await currentUser();
  const email = user?.emailAddresses[0]?.emailAddress ?? "";

  return (
    <div className="min-h-screen" style={{ background: "#f8f5f0" }}>
      <header style={{ background: "#f8f5f0", borderBottom: "1px solid rgba(0,0,0,0.07)" }}>
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/dashboard" style={{ fontFamily: "'Playfair Display', Georgia, serif", color: "#1c1917", fontSize: "1.25rem", fontWeight: 500 }}>
            folyyo
          </Link>
          <div className="flex items-center gap-5">
            <Link href="/onboarding"
              className="rounded-full px-5 py-2 text-sm font-medium text-white transition hover:opacity-80"
              style={{ background: "#1c1917" }}>
              + Nouveau portfolio
            </Link>
            <span className="mono text-xs" style={{ color: "#c8c4bf" }}>{email}</span>
            <SignOutButton redirectUrl="/">
              <button className="text-sm transition hover:opacity-60" style={{ color: "#a09a94" }}>
                Déconnexion
              </button>
            </SignOutButton>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-6 py-10">{children}</div>
    </div>
  );
}
