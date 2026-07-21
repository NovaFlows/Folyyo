import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { isAdmin } from "@/lib/auth/admin";
import { getAllLivePortfoliosForAdmin, getSupportMessages } from "@/lib/db/queries";
import AdminPortfolioList from "./AdminPortfolioList";

export default async function AdminPage() {
  const { userId } = await auth();
  if (!isAdmin(userId)) notFound();

  const [portfolios, supportMessages] = await Promise.all([
    getAllLivePortfoliosForAdmin(),
    getSupportMessages(),
  ]);
  const openSupportCount = supportMessages.filter((m) => m.status !== "resolved").length;

  return (
    <div>
      <div className="mb-6">
        <Link href="/dashboard/admin/support" className="text-sm font-medium transition hover:opacity-70" style={{ color: "#c9a96e" }}>
          Messages support →{openSupportCount > 0 ? ` (${openSupportCount} ouvert${openSupportCount > 1 ? "s" : ""})` : ""}
        </Link>
      </div>
      <div className="mb-10">
        <p className="mono text-xs tracking-widest uppercase mb-2" style={{ color: "#a09a94", letterSpacing: "0.12em" }}>admin</p>
        <h1 className="text-3xl serif" style={{ fontWeight: 500, color: "#1c1917" }}>
          Communauté — {portfolios.length} portfolio{portfolios.length > 1 ? "s" : ""} en ligne
        </h1>
        <p className="mt-2 text-sm" style={{ color: "#78716c" }}>
          Mets en avant les meilleurs portfolios pour la page publique /community et le sélecteur de style à l&apos;onboarding.
        </p>
      </div>

      <AdminPortfolioList portfolios={portfolios} />
    </div>
  );
}
