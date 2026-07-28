// Récupère le texte lisible du site web fourni par l'utilisateur à l'onboarding
// (profil « Autre » notamment) — données supplémentaires pour que l'IA génère un
// portfolio plus riche/pertinent. Best-effort : ne lève jamais d'exception,
// retourne null si le site est inaccessible, vide ou trop long à répondre, pour
// ne jamais bloquer la génération.

const ENTITIES: Record<string, string> = {
  "&nbsp;": " ", "&amp;": "&", "&lt;": "<", "&gt;": ">",
  "&#39;": "'", "&apos;": "'", "&quot;": '"', "&eacute;": "é",
  "&egrave;": "è", "&agrave;": "à", "&ccedil;": "ç", "&ocirc;": "ô",
};

export async function fetchWebsiteText(url: string, maxChars = 4000, timeoutMs = 8000): Promise<string | null> {
  let target = (url || "").trim();
  if (!target) return null;
  if (!/^https?:\/\//i.test(target)) target = "https://" + target;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(target, {
      signal: ctrl.signal,
      headers: {
        // Beaucoup de sites renvoient 403 sans UA "navigateur".
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        Accept: "text/html,*/*",
      },
    });
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") ?? "";
    if (!ct.includes("html") && !ct.includes("text")) return null;

    const html = await res.text();
    let text = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<[^>]+>/g, " ");
    for (const [ent, ch] of Object.entries(ENTITIES)) text = text.split(ent).join(ch);
    text = text.replace(/&#\d+;/g, " ").replace(/\s+/g, " ").trim();

    return text.length >= 40 ? text.slice(0, maxChars) : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
