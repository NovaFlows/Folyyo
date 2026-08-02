import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { isAdmin } from "@/lib/auth/admin";
import { getReviews } from "@/lib/db/queries";
import AdminReviewsList from "../AdminReviewsList";

export default async function AdminReviewsPage() {
  const { userId } = await auth();
  if (!isAdmin(userId)) notFound();

  const reviews = await getReviews();
  const average = reviews.length
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-x-5 gap-y-2">
        <Link href="/dashboard/admin" className="text-sm transition hover:opacity-70" style={{ color: "#a09a94" }}>
          ← Portfolios vedettes
        </Link>
        <Link href="/dashboard/admin/support" className="text-sm transition hover:opacity-70" style={{ color: "#a09a94" }}>
          Messages support →
        </Link>
      </div>
      <div className="mb-10">
        <p className="mono text-xs tracking-widest uppercase mb-2" style={{ color: "#a09a94", letterSpacing: "0.12em" }}>admin</p>
        <h1 className="text-3xl serif" style={{ fontWeight: 500, color: "#1c1917" }}>
          Avis clients — {reviews.length} avis{average ? ` · ${average}/5 en moyenne` : ""}
        </h1>
        <p className="mt-2 text-sm" style={{ color: "#78716c" }}>
          Notes et commentaires envoyés depuis le popup du dashboard.
        </p>
      </div>

      <AdminReviewsList reviews={reviews} />
    </div>
  );
}
