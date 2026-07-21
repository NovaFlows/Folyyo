"use client";

import { useState, useCallback, useEffect } from "react";
import { LOCALE_COOKIE, type Locale } from "./types";

function readCookieLocale(): Locale {
  if (typeof document === "undefined") return "fr";
  const match = document.cookie.match(new RegExp(`(?:^|; )${LOCALE_COOKIE}=([^;]*)`));
  const v = match?.[1];
  return v === "en" || v === "es" ? v : "fr";
}

// Pour les pages purement client (login/signup — formulaires interactifs,
// pas de Server Component) : lit le cookie de langue au montage, et expose
// un setter qui pose le cookie ET déclenche un re-render local (pas de
// router.refresh() possible/utile ici, contrairement aux pages qui lisent
// getLocale() côté serveur).
//
// État initial toujours "fr" (identique SSR/premier rendu client, évite un
// avertissement d'hydratation) puis corrigé juste après le montage via
// useEffect — document.cookie n'existe pas côté serveur, donc un useState
// paresseux qui le lirait directement resterait figé sur "fr" après
// l'hydratation (React réutilise le résultat du rendu serveur, il ne
// relance pas l'initialiseur), ce qui ignorerait silencieusement le cookie.
export function useLocale(): [Locale, (next: Locale) => void] {
  const [locale, setLocaleState] = useState<Locale>("fr");

  useEffect(() => {
    const actual = readCookieLocale();
    setLocaleState((prev) => (prev === actual ? prev : actual));
  }, []);

  const setLocale = useCallback((next: Locale) => {
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=${60 * 60 * 24 * 365}`;
    setLocaleState(next);
  }, []);

  return [locale, setLocale];
}
