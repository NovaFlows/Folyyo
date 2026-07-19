// Segments racine déjà utilisés par l'app (routes statiques) + quelques
// réservations préventives pour des routes probables à venir — un slug de
// portfolio ne doit jamais coïncider avec l'un d'eux, sous peine d'être
// masqué par la route statique correspondante (elle gagne toujours sur /[slug]).
export const RESERVED_SLUGS = new Set([
  "login", "signup", "dashboard", "onboarding", "portfolio", "api",
  "community", "contact", "preview", "sso-callback",
  "admin", "settings", "pricing", "about", "blog", "help", "terms",
  "privacy", "sitemap",
]);

export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.has(slug.toLowerCase());
}
