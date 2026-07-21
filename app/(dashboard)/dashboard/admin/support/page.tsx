import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { isAdmin } from "@/lib/auth/admin";
import { getSupportMessages } from "@/lib/db/queries";
import AdminSupportList from "../AdminSupportList";

export default async function AdminSupportPage() {
  const { userId } = await auth();
  if (!isAdmin(userId)) notFound();

  const messages = await getSupportMessages();
  const openCount = messages.filter((m) => m.status !== "resolved").length;

  return (
    <div>
      <div className="mb-6">
        <Link href="/dashboard/admin" className="text-sm transition hover:opacity-70" style={{ color: "#a09a94" }}>
          ← Portfolios vedettes
        </Link>
      </div>
      <div className="mb-10">
        <p className="mono text-xs tracking-widest uppercase mb-2" style={{ color: "#a09a94", letterSpacing: "0.12em" }}>admin</p>
        <h1 className="text-3xl serif" style={{ fontWeight: 500, color: "#1c1917" }}>
          Messages support — {openCount} ouvert{openCount > 1 ? "s" : ""}
        </h1>
        <p className="mt-2 text-sm" style={{ color: "#78716c" }}>
          Messages envoyés depuis le dashboard (problème/suggestion/autre).
        </p>
      </div>

      <AdminSupportList messages={messages} />
    </div>
  );
}
