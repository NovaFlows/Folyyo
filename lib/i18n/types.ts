// Séparé de locale.ts (qui importe next/headers, server-only) pour que les
// composants client puissent importer LOCALE_COOKIE/Locale sans entraîner
// next/headers dans le bundle client.
export type Locale = "fr" | "en" | "es";
export const LOCALE_COOKIE = "folyyo_locale";
