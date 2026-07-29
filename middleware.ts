import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { LOCALE_COOKIE } from "@/lib/i18n/types";
import { languageForCountry, localeFromAcceptLanguage } from "@/lib/i18n/country-language";

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

  // Langue de l'interface, par ordre de priorité :
  //  1. le cookie déjà posé par le sélecteur FR/EN/ES/DE (choix explicite) ;
  //  2. la langue du navigateur (header Accept-Language) — signal le plus
  //     fiable de la préférence réelle de la personne ;
  //  3. en dernier recours, le pays géolocalisé par IP ("x-vercel-ip-country",
  //     posé par Vercel en prod) — peu fiable (data mobile / VPN peuvent
  //     géolocaliser un Français hors zone francophone), d'où sa relégation ;
  //  4. repli final sur le français.
  // Transmise via un header à CETTE requête (le cookie de réponse ne serait
  // visible qu'à la requête suivante).
  const existingLocale = req.cookies.get(LOCALE_COOKIE)?.value;
  const country = req.headers.get("x-vercel-ip-country") ?? undefined;
  const locale = existingLocale === "en" || existingLocale === "es" || existingLocale === "de" || existingLocale === "fr"
    ? existingLocale
    : (localeFromAcceptLanguage(req.headers.get("accept-language"))
        ?? (country ? languageForCountry(country) : null)
        ?? "fr");

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
