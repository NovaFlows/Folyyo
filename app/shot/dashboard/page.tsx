import type { Metadata } from "next";
import DashboardShell from "@/app/(dashboard)/DashboardShell";
import DashboardContent from "@/app/(dashboard)/dashboard/DashboardContent";
import { assertLocalOnly, shotLocale, SHOT_DEFAULT_USER_ID } from "../config";

// Jamais prérendu au build (sinon Next tenterait un accès Neon au moment du
// build) et jamais mis en cache — voir app/shot/config.ts pour le mode d'emploi.
export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };

// Capture du dashboard tel que le voit un utilisateur connecté :
//   http://localhost:3000/shot/dashboard
//   http://localhost:3000/shot/dashboard?userId=user_xxx&locale=en
export default function ShotDashboardPage({
  searchParams,
}: {
  searchParams: { userId?: string; locale?: string };
}) {
  assertLocalOnly();

  const userId = searchParams.userId || SHOT_DEFAULT_USER_ID;
  const locale = shotLocale(searchParams.locale);

  return (
    <DashboardShell userId={userId} locale={locale}>
      {/* Popup d'avis et check de fraîcheur désactivés : le premier polluerait
          l'image, le second frappe GitHub/YouTube et écrit en base. */}
      <DashboardContent userId={userId} locale={locale} withReviewPopup={false} withFreshness={false} />
    </DashboardShell>
  );
}
