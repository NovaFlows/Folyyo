interface ClerkApiError {
  code?: string;
  message?: string;
  meta?: { paramName?: string };
}

const MESSAGES: Record<string, string> = {
  form_identifier_not_found:     "Aucun compte n'est associé à cette adresse email.",
  form_password_incorrect:       "Mot de passe incorrect.",
  form_identifier_exists:        "Un compte existe déjà avec cette adresse email.",
  form_password_pwned:           "Ce mot de passe a fuité dans une base de données publique — choisis-en un autre.",
  form_password_length_too_short: "Le mot de passe doit contenir au moins 8 caractères.",
  form_password_not_strong_enough: "Ce mot de passe n'est pas assez robuste.",
  form_code_incorrect:           "Le code saisi est incorrect.",
  form_identifier_missing:       "Merci de renseigner ton adresse email.",
  verification_expired:         "Ce code a expiré — demande-en un nouveau.",
  verification_failed:          "La vérification a échoué — réessaie.",
  too_many_requests:             "Trop de tentatives — réessaie dans quelques minutes.",
};

// Traduit les erreurs Clerk (anglais par défaut) en français, avec un message
// générique de secours pour les codes non répertoriés — jamais de texte anglais brut affiché.
export function clerkErrorMessage(err: unknown, fallback: string): string {
  const e = err as { errors?: ClerkApiError[] };
  const first = e.errors?.[0];
  if (!first) return fallback;

  if (first.code === "form_param_format_invalid" && first.meta?.paramName === "email_address") {
    return "Merci de saisir une adresse email valide (ex : toi@exemple.com).";
  }

  return MESSAGES[first.code ?? ""] ?? fallback;
}
