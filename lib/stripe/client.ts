import Stripe from "stripe";

let _stripe: Stripe | null = null;

// Instanciation paresseuse : `new Stripe()` lève immédiatement si la clé est
// absente. Un export au niveau module (`export const stripe = new Stripe(...)`)
// casserait le build Next dès que n'importe quelle route important ce fichier
// est analysée ("Collecting page data"), même si la route n'est jamais
// appelée — donc tant que STRIPE_SECRET_KEY n'est pas encore configurée sur
// Vercel. getStripe() ne construit l'instance qu'au premier appel réel.
export function getStripe(): Stripe {
  if (!_stripe) _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  return _stripe;
}
