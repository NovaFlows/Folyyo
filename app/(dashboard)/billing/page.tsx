import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getLocale } from "@/lib/i18n/locale";
import { getUserSettings } from "@/lib/db/queries";
import BillingPageClient from "./BillingPageClient";

// Server Component : lit la langue via le cookie (comme /support, /settings)
// et ne passe que des données sérialisables au Client Component — le
// dictionnaire billing.* contient des fonctions (statusTrialing, etc.),
// jamais passé tel quel à travers la frontière RSC.
export default async function BillingPage() {
  const { userId } = await auth();
  if (!userId) redirect("/login");

  const locale = getLocale();
  const settings = await getUserSettings(userId);

  return (
    <BillingPageClient
      locale={locale}
      subscriptionStatus={settings?.subscription_status ?? "trialing"}
      trialEndsAt={settings?.trial_ends_at ?? null}
      currentPeriodEnd={settings?.subscription_current_period_end ?? null}
      hasStripeCustomer={!!settings?.stripe_customer_id}
    />
  );
}
