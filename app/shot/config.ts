// ─────────────────────────────────────────────────────────────────────────────
// Routes de CAPTURE D'ÉCRAN — RÉSERVÉES AU DÉVELOPPEMENT LOCAL.
//
// Les pages du dashboard et de l'éditeur visuel sont derrière Clerk, et la clé
// Clerk de `.env.local` est une clé de DEV alors que folyo.page tourne sur
// l'instance de PROD : impossible de fabriquer une session valide en local pour
// les capturer. Ces routes rendent donc exactement le même visuel (mêmes
// composants, mêmes données Neon) mais sans passer par `auth()`.
//
// Sécurité : chaque page de /shot commence par
//   if (process.env.NODE_ENV === "production") notFound();
// (même pattern que app/api/admin/seed-community/route.ts). NODE_ENV vaut
// "production" sur TOUT déploiement Vercel, preview comprise — ces pages sont
// donc injoignables en ligne. `/shot` est aussi interdit dans app/robots.ts et
// absent de app/sitemap.ts.
//
// Usage (serveur de dev sur :3000) :
//   chrome.exe --headless=new --disable-gpu --hide-scrollbars \
//     --virtual-time-budget=8000 --screenshot="C:\...\dash.png" \
//     --window-size=1920,1080 "http://localhost:3000/shot/dashboard"
//   .../shot/editor/<slug>
// Option commune : ?userId=<clerk_user_id> pour capturer le dashboard d'un
// autre compte, et ?locale=fr|en|es|de pour forcer la langue de l'interface.
// ─────────────────────────────────────────────────────────────────────────────

import { notFound } from "next/navigation";
import { getLocale } from "@/lib/i18n/locale";
import type { Locale } from "@/lib/i18n/types";

// Compte admin propriétaire des portfolios de démo de la Communauté — dashboard
// bien rempli, donc capture représentative.
export const SHOT_DEFAULT_USER_ID = "user_3HDxSDOY5HHF3Wl0qc8AI4ildhB";

// À appeler en TOUT PREMIER dans chaque page de /shot.
export function assertLocalOnly(): void {
  if (process.env.NODE_ENV === "production") notFound();
}

// Langue de l'interface : `?locale=` si fourni (pratique pour capturer les
// versions EN/ES/DE), sinon la détection habituelle (header/cookie).
export function shotLocale(raw?: string): Locale {
  return raw === "fr" || raw === "en" || raw === "es" || raw === "de" ? raw : getLocale();
}
