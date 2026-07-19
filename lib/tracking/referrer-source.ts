export type ViewSource = "instagram" | "facebook" | "linkedin" | "twitter" | "community" | "other";

export const SOURCE_LABELS: Record<ViewSource, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  linkedin: "LinkedIn",
  twitter: "Twitter / X",
  community: "Communauté Folyyo",
  other: "Autre / direct",
};

// Classification par nom de domaine du referrer (pas de tracking, juste ce
// que le navigateur envoie déjà) — "communauté" est repéré par le chemin
// /community, indépendamment de l'hôte (folyyo.com, *.vercel.app, localhost…).
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
