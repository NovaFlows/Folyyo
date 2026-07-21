import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { getStripe } from "@/lib/stripe/client";
import { getUserSettings } from "@/lib/db/queries";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://folyyo.vercel.app";

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { plan } = await request.json();
  const priceId = plan === "yearly" ? process.env.STRIPE_PRICE_ID_YEARLY : process.env.STRIPE_PRICE_ID_MONTHLY;
  if (!priceId) return NextResponse.json({ error: "Configuration de paiement manquante" }, { status: 500 });

  const settings = await getUserSettings(userId);
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress;

  const session = await getStripe().checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    // client_reference_id ET metadata sur la subscription : le premier ne
    // survit qu'au Checkout Session lui-même, le second se retrouve sur
    // l'objet Subscription — nécessaire pour les webhooks de cycle de vie
    // (customer.subscription.updated/deleted) qui ne portent jamais
    // client_reference_id, seulement l'id client Stripe.
    client_reference_id: userId,
    subscription_data: { metadata: { clerkUserId: userId } },
    customer_email: settings?.stripe_customer_id ? undefined : email,
    customer: settings?.stripe_customer_id ?? undefined,
    success_url: `${APP_URL}/billing?success=1`,
    cancel_url: `${APP_URL}/billing?canceled=1`,
  });

  if (!session.url) return NextResponse.json({ error: "Impossible de créer la session de paiement" }, { status: 500 });
  return NextResponse.json({ url: session.url });
}
