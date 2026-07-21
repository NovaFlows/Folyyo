import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { deleteAllPortfoliosForUser, deleteUserSettings, getUserSettings } from "@/lib/db/queries";
import { stripe } from "@/lib/stripe/client";

// Suppression définitive : nettoie d'abord toutes les données applicatives
// (portfolios — et par cascade DB leurs vues/versions/éditions — puis les
// préférences de compte) AVANT de supprimer le compte Clerk lui-même, pour
// ne jamais laisser de portfolios orphelins encore visibles publiquement
// une fois le compte parti.
export async function POST() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  try {
    // Annule l'abonnement Stripe AVANT de supprimer la ligne qui porte
    // stripe_subscription_id — sinon le client continue d'être facturé sans
    // qu'aucune donnée ne permette de relier ça à quoi que ce soit.
    const settings = await getUserSettings(userId);
    if (settings?.stripe_subscription_id) {
      await stripe.subscriptions.cancel(settings.stripe_subscription_id).catch((err) => {
        console.error("[user/delete] échec annulation Stripe:", err);
      });
    }
    await deleteAllPortfoliosForUser(userId);
    await deleteUserSettings(userId);
    await clerkClient().users.deleteUser(userId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[user/delete] error:", err);
    return NextResponse.json({ error: "Impossible de supprimer le compte" }, { status: 500 });
  }
}
