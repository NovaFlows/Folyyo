import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getPortfoliosByUser } from "@/lib/db/queries";
import type { Portfolio } from "@/types";
import PortfolioCard from "./PortfolioCard";

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect("/login");

  const portfolios = await getPortfoliosByUser(userId);

  return (
    <div>
      <div className="mb-10 flex items-end justify-between">
        <div>
          <p className="mono text-xs tracking-widest uppercase mb-2" style={{ color: "#a09a94", letterSpacing: "0.12em" }}>portfolios</p>
          <h1 className="text-3xl serif" style={{ fontWeight: 500, color: "#1c1917" }}>
            {portfolios.length === 0 ? "Aucun portfolio encore" : `${portfolios.length} portfolio${portfolios.length > 1 ? "s" : ""}`}
          </h1>
        </div>
        <Link href="/onboarding"
          className="rounded-full px-6 py-2.5 text-sm font-medium text-white transition hover:opacity-80"
          style={{ background: "#1c1917" }}>
          + Nouveau
        </Link>
      </div>

      {!portfolios.length ? <EmptyState /> : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {portfolios.map((p: Portfolio) => (
            <PortfolioCard key={p.id} portfolio={p} />
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="mb-8 h-16 w-16 rounded-full flex items-center justify-center"
        style={{ background: "#f0ece6", border: "1px solid rgba(0,0,0,0.06)" }}>
        <span className="mono" style={{ color: "#c9a96e", fontSize: "1.25rem" }}>+</span>
      </div>
      <h2 className="mb-3 text-xl serif" style={{ fontWeight: 500, color: "#1c1917" }}>
        Ton premier portfolio
      </h2>
      <p className="mb-8 text-sm" style={{ color: "#78716c" }}>Génère un portfolio professionnel en moins de 60 secondes.</p>
      <Link href="/onboarding"
        className="rounded-full px-8 py-3 text-sm font-medium text-white transition hover:opacity-80"
        style={{ background: "#1c1917" }}>
        Créer mon portfolio →
      </Link>
    </div>
  );
}
