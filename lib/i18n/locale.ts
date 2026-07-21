import { cookies, headers } from "next/headers";
import { LOCALE_COOKIE, type Locale } from "./types";

export type { Locale };
export { LOCALE_COOKIE };

// Langue de l'INTERFACE (landing, dashboard, éditeur) — indépendante de la
// langue du contenu généré du portfolio (celle-ci vient du pays choisi à
// l'onboarding, voir lib/i18n/country-language.ts). Choisie via le sélecteur
// FR/EN/ES (components/i18n/LanguageToggle.tsx), mémorisée par cookie —
// et, à la toute première visite (avant que ce cookie n'existe), déduite du
// pays du visiteur par middleware.ts, qui la transmet via le header
// "x-locale" (le cookie qu'il pose au même moment ne serait visible qu'à la
// requête SUIVANTE, trop tard pour ce rendu-ci). Repli sur le cookie puis
// sur le français si, pour une raison quelconque, le header est absent.
export function getLocale(): Locale {
  const h = headers().get("x-locale");
  if (h === "en" || h === "es" || h === "fr") return h;
  const v = cookies().get(LOCALE_COOKIE)?.value;
  return v === "en" || v === "es" ? v : "fr";
}
