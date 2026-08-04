import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import DashboardContent from "./DashboardContent";
import { getLocale } from "@/lib/i18n/locale";

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect("/login");

  // Tout le rendu vit dans DashboardContent (partagé avec la route de capture
  // locale app/shot/dashboard) — cette page ne fait plus que l'auth.
  return <DashboardContent userId={userId} locale={getLocale()} />;
}
