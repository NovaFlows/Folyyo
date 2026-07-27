// Module neutre (ni "use client" ni Server Component) : importable aussi bien
// depuis des Server Components que des Client Components sans passer par une
// frontière RSC. Placer ces constantes dans un fichier "use client" cassait
// leur usage côté serveur — Next.js traite TOUS les exports d'un module client
// comme des références opaques, même de simples objets non-composants.

// Labels courts pour les puces compactes (cartes dashboard, admin, templates)
export const PROFILE_LABEL: Record<string, string> = {
  developer:   "IT",
  designer:    "designer",
  photographe: "photo",
  artist:      "artiste",
  fashion:   "mode",
  musicien:  "musicien",
  other:     "autre",
};

// Même jeu de clés, version complète pour les affichages type fiche/détail
// (ex. panneau "Infos" de la page portfolio) — une seule source pour les deux
// formats évite qu'ils divergent quand un profil est ajouté/renommé.
export const PROFILE_LABEL_FULL: Record<string, string> = {
  developer:   "IT",
  designer:    "Designer",
  photographe: "Photographe",
  artist:      "Artiste",
  fashion:   "Mode",
  musicien:  "Musicien",
  other:     "Autre",
};
