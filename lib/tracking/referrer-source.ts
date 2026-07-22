import type { Locale } from "@/lib/i18n/types";

export type ViewSource = "instagram" | "facebook" | "linkedin" | "twitter" | "community" | "other";

const COMMUNITY_LABEL: Record<Locale, string> = { fr: "Communauté Folyo", en: "Folyo community", es: "Comunidad Folyo", de: "Folyo-Community" };
const OTHER_LABEL: Record<Locale, string> = { fr: "Autre / direct", en: "Other / direct", es: "Otro / directo", de: "Sonstiges / direkt" };

export function getSourceLabels(locale: Locale): Record<ViewSource, string> {
  return {
    instagram: "Instagram",
    facebook: "Facebook",
    linkedin: "LinkedIn",
    twitter: "Twitter / X",
    community: COMMUNITY_LABEL[locale],
    other: OTHER_LABEL[locale],
  };
}

// Classification par nom de domaine du referrer (pas de tracking, juste ce
// que le navigateur envoie déjà) — "communauté" est repéré par le chemin
// /community, indépendamment de l'hôte (folyo.page, *.vercel.app, localhost…).
export function classifyReferrer(referrer: string | null): ViewSource {
  if (!referrer) return "other";
  let url: URL;
  try {
    url = new URL(referrer);
  } catch {
    return "other";
  }
  if (url.pathname.startsWith("/community")) return "community";

  const host = url.hostname.replace(/^(www|l|lm|m)\./, "");
  if (host.endsWith("instagram.com")) return "instagram";
  if (host.endsWith("facebook.com") || host === "fb.me") return "facebook";
  if (host.endsWith("linkedin.com") || host === "lnkd.in") return "linkedin";
  if (host.endsWith("twitter.com") || host.endsWith("x.com") || host === "t.co") return "twitter";
  return "other";
}
