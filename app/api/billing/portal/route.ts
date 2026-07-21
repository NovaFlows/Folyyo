import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { stripe } from "@/lib/stripe/client";
import { getUserSettings } from "@/lib/db/queries";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://folyyo.vercel.app";

export async function POST() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const settings = await getUserSettings(userId);
  if (!settings?.stripe_customer_id) {
    return NextResponse.json({ error: "Aucun abonnement à gérer" }, { status: 400 });
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: settings.stripe_customer_id,
    return_url: `${APP_URL}/billing`,
  });

  return NextResponse.json({ url: session.url });
}
