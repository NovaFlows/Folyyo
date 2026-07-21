import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { LOCALE_COOKIE } from "@/lib/i18n/types";
import { languageForCountry } from "@/lib/i18n/country-language";

const isProtected = createRouteMatcher([
  "/dashboard(.*)",
  "/onboarding(.*)",
  "/portfolio(.*)",
  "/settings(.*)",
  "/billing(.*)",
]);

// Identifiant anonyme par appareil (aucune donnée personnelle) utilisé pour
// dédoublonner le comptage de vues des portfolios (voir app/[slug]/page.tsx)
// — sans ça, rafraîchir une page compterait une nouvelle vue à chaque fois.
const VISITOR_COOKIE = "pf_vid";

export default clerkMiddleware((auth, req) => {
  if (isProtected(req)) auth().protect();

  // Langue de l'interface : respecte le cookie déjà posé par le sélecteur
  // FR/EN/ES s'il existe (choix explicite de la personne) ; sinon la déduit
  // du pays du visiteur — header "x-vercel-ip-country" posé automatiquement
  // par la géolocalisation IP de Vercel en production (absent en local dev,
  // d'où le repli sur "fr"). Espagne → espagnol, France/francophones →
  // français, le reste → anglais (même mapping que la langue de génération,
  // voir lib/i18n/country-language.ts). Transmise via un header à la requête
  // (pas seulement le cookie de réponse, qui ne serait visible qu'à la
  // requête suivante) pour que CE chargement de page en profite déjà.
  const existingLocale = req.cookies.get(LOCALE_COOKIE)?.value;
  const locale = existingLocale === "en" || existingLocale === "es" || existingLocale === "fr"
    ? existingLocale
    : (() => {
        const country = req.headers.get("x-vercel-ip-country") ?? undefined;
        return country ? (languageForCountry(country) ?? "en") : "fr";
      })();

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-locale", locale);
  const res = NextResponse.next({ request: { headers: requestHeaders } });

  if (!existingLocale) {
    res.cookies.set(LOCALE_COOKIE, locale, {
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
    });
  }

  if (!req.cookies.get(VISITOR_COOKIE)) {
    res.cookies.set(VISITOR_COOKIE, crypto.randomUUID(), {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
    });
  }
  return res;
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
