import dns from "node:dns/promises";
import net from "node:net";

// Protection SSRF minimale pour les fonctions qui font un `fetch()` serveur
// sur une URL fournie par l'utilisateur (onboarding "site web perso" —
// lib/portfolio/website-text.ts — et "copier le style de ce site" —
// lib/anthropic/style-from-url.ts). Sans ce garde-fou, un compte pouvait
// faire requêter par le serveur n'importe quelle adresse interne
// (127.0.0.1, réseau privé Vercel, 169.254.169.254 — métadonnées cloud
// AWS/GCP/Azure…) et récupérer une partie de la réponse via le texte
// scrappé, qui atterrit ensuite dans le prompt Claude puis potentiellement
// dans le portfolio généré (fuite de données internes).
//
// Limite assumée : la résolution DNS est vérifiée UNE FOIS ici, puis `fetch`
// résout à nouveau lui-même l'hôte pour se connecter — un attaquant capable
// de faire du DNS rebinding parfaitement chronométré (réponse différente
// entre les deux résolutions) pourrait contourner ce contrôle. Hors de
// portée d'un correctif ciblé : ça couvre l'immense majorité des abus réels
// (URL pointant directement vers une IP privée/loopback/link-local).

function isPrivateIp(ip: string): boolean {
  if (net.isIP(ip) === 0) return true; // ne devrait jamais arriver — on bloque par prudence
  if (ip === "0.0.0.0" || ip === "::" || ip === "::1") return true;
  if (/^127\./.test(ip)) return true;               // loopback IPv4
  if (/^10\./.test(ip)) return true;                 // RFC1918
  if (/^192\.168\./.test(ip)) return true;           // RFC1918
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(ip)) return true; // RFC1918
  if (/^169\.254\./.test(ip)) return true;           // link-local — métadonnées cloud
  if (/^::ffff:127\./.test(ip)) return true;         // loopback IPv4-mapped
  if (/^fe80:/i.test(ip)) return true;               // link-local IPv6
  if (/^f[cd][0-9a-f]{2}:/i.test(ip)) return true;   // ULA IPv6 (fc00::/7)
  return false;
}

// Lève une erreur si l'URL n'est pas un http(s) public résolvable vers une
// IP non privée. À appeler juste avant chaque `fetch()` sur une URL
// utilisateur — laisser l'appelant catcher (ces fonctions dégradent déjà
// silencieusement vers `null` en cas d'échec réseau).
export async function assertPublicHttpUrl(rawUrl: string): Promise<void> {
  const url = new URL(rawUrl);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Schéma d'URL non autorisé");
  }
  if (url.hostname === "localhost") throw new Error("URL non autorisée");

  const { address } = await dns.lookup(url.hostname);
  if (isPrivateIp(address)) throw new Error("URL non autorisée");
}
