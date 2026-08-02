import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripe } from "@/lib/stripe/client";
import { setSubscriptionActive, setSubscriptionStatusByCustomerId, getUserSettingsByStripeCustomerId } from "@/lib/db/queries";
import { notifyNewSubscription } from "@/lib/email/notify";

// La vérification de signature Stripe exige le corps BRUT (pas le JSON déjà
// parsé) — App Router ne parse rien par défaut, `request.text()` suffit
// (contrairement aux Pages API qui nécessitaient `bodyParser:false`).
export async function POST(request: NextRequest) {
  const stripe = getStripe();
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Signature manquante" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error("[stripe webhook] signature invalide:", (err as Error).message);
    return NextResponse.json({ error: "Signature invalide" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        // Paiements asynchrones (ex. virements SEPA) : le checkout peut se
        // compléter avant confirmation réelle du paiement — attendre
        // invoice.payment_failed / customer.subscription.updated dans ce cas.
        if (session.payment_status !== "paid") break;
        const userId = session.client_reference_id;
        const customerId = session.customer as string | null;
        const subscriptionId = session.subscription as string | null;
        if (!userId || !customerId || !subscriptionId) break;

        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const item = subscription.items.data[0];
        const priceId = item?.price.id ?? "";
        const currentPeriodEnd = new Date((item?.current_period_end ?? Math.floor(Date.now() / 1000)) * 1000);
        await setSubscriptionActive(userId, { stripeCustomerId: customerId, stripeSubscriptionId: subscriptionId, stripePriceId: priceId, currentPeriodEnd });

        // Notification e-mail à l'exploitant (best-effort : n'interrompt jamais
        // le webhook — notifyNewSubscription avale ses propres erreurs).
        const price = item?.price;
        const amount = price?.unit_amount != null
          ? `${(price.unit_amount / 100).toFixed(2).replace(".", ",")} ${price.currency.toUpperCase()}`
          : "";
        const plan = price?.recurring?.interval === "year" ? "Annuel"
          : price?.recurring?.interval === "month" ? "Mensuel" : "";
        await notifyNewSubscription({
          email: session.customer_details?.email ?? session.customer_email ?? "",
          plan,
          amount,
          userId,
        });
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const item = subscription.items.data[0];
        const priceId = item?.price.id;
        const currentPeriodEnd = new Date((item?.current_period_end ?? Math.floor(Date.now() / 1000)) * 1000);
        // Stripe garde généralement le statut "active" jusqu'à la fin de la
        // période même après une annulation (cancel_at_period_end) — on ne
        // verrouille qu'au véritable statut "canceled"/"unpaid"/etc.
        const status = subscription.status === "active" || subscription.status === "trialing" ? "active"
          : subscription.status === "past_due" || subscription.status === "unpaid" ? "past_due"
          : "canceled";

        let ok = await trySetByCustomerId(customerId, status, subscription.id, priceId, currentPeriodEnd);
        if (!ok) {
          // Repli : le customer_id n'a peut-être pas encore été enregistré
          // (webhooks non garantis dans l'ordre) — on retrouve le compte via
          // le metadata posé sur la subscription à la création du Checkout.
          const clerkUserId = subscription.metadata?.clerkUserId;
          if (clerkUserId) {
            await setSubscriptionActive(clerkUserId, { stripeCustomerId: customerId, stripeSubscriptionId: subscription.id, stripePriceId: priceId ?? "", currentPeriodEnd });
            if (status !== "active") await setSubscriptionStatusByCustomerId(customerId, status);
            ok = true;
          }
        }
        if (!ok) console.error("[stripe webhook] compte introuvable pour customer", customerId);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string | null;
        if (customerId) await setSubscriptionStatusByCustomerId(customerId, "past_due");
        break;
      }

      default:
        break;
    }
  } catch (err) {
    console.error("[stripe webhook] erreur de traitement:", err);
    return NextResponse.json({ error: "Erreur de traitement" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function trySetByCustomerId(customerId: string, status: "active" | "past_due" | "canceled", subscriptionId: string, priceId: string | undefined, currentPeriodEnd: Date): Promise<boolean> {
  const existing = await getUserSettingsByStripeCustomerId(customerId);
  if (!existing) return false;
  await setSubscriptionStatusByCustomerId(customerId, status, { stripeSubscriptionId: subscriptionId, stripePriceId: priceId, currentPeriodEnd });
  return true;
}
