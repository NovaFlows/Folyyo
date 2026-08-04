import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getLocale } from "@/lib/i18n/locale";
import DashboardShell from "./DashboardShell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();
  if (!userId) redirect("/login");

  // Tout l'habillage vit dans DashboardShell (partagé avec la route de capture
  // locale app/shot/dashboard) — ce layout ne fait plus que l'auth.
  return <DashboardShell userId={userId} locale={getLocale()}>{children}</DashboardShell>;
}
