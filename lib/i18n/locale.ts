import { cookies } from "next/headers";
import { LOCALE_COOKIE, type Locale } from "./types";

export type { Locale };
export { LOCALE_COOKIE };

// Langue de l'INTERFACE (landing, dashboard, éditeur) — indépendante de la
// langue du contenu généré du portfolio (celle-ci vient du pays choisi à
// l'onboarding, voir lib/i18n/country-language.ts). Choisie via le sélecteur
// FR/EN/ES (components/i18n/LanguageToggle.tsx), mémorisée par cookie,
// français par défaut.
export function getLocale(): Locale {
  const v = cookies().get(LOCALE_COOKIE)?.value;
  return v === "en" || v === "es" ? v : "fr";
}
