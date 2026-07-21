import type { Locale } from "@/lib/i18n/types";

interface ClerkApiError {
  code?: string;
  message?: string;
  meta?: { paramName?: string };
}

const MESSAGES: Record<Locale, Record<string, string>> = {
  fr: {
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
    form_param_format_invalid_email: "Merci de saisir une adresse email valide (ex : toi@exemple.com).",
  },
  en: {
    form_identifier_not_found:     "No account is associated with this email address.",
    form_password_incorrect:       "Incorrect password.",
    form_identifier_exists:        "An account already exists with this email address.",
    form_password_pwned:           "This password was found in a public data breach — please choose another one.",
    form_password_length_too_short: "Your password must be at least 8 characters long.",
    form_password_not_strong_enough: "This password isn't strong enough.",
    form_code_incorrect:           "The code you entered is incorrect.",
    form_identifier_missing:       "Please enter your email address.",
    verification_expired:         "This code has expired — request a new one.",
    verification_failed:          "Verification failed — please try again.",
    too_many_requests:             "Too many attempts — try again in a few minutes.",
    form_param_format_invalid_email: "Please enter a valid email address (e.g. you@example.com).",
  },
  es: {
    form_identifier_not_found:     "No hay ninguna cuenta asociada a esta dirección de email.",
    form_password_incorrect:       "Contraseña incorrecta.",
    form_identifier_exists:        "Ya existe una cuenta con esta dirección de email.",
    form_password_pwned:           "Esta contraseña se ha filtrado en una base de datos pública — elige otra.",
    form_password_length_too_short: "La contraseña debe tener al menos 8 caracteres.",
    form_password_not_strong_enough: "Esta contraseña no es lo bastante segura.",
    form_code_incorrect:           "El código introducido es incorrecto.",
    form_identifier_missing:       "Introduce tu dirección de email.",
    verification_expired:         "Este código ha caducado — solicita uno nuevo.",
    verification_failed:          "La verificación ha fallado — inténtalo de nuevo.",
    too_many_requests:             "Demasiados intentos — inténtalo de nuevo en unos minutos.",
    form_param_format_invalid_email: "Introduce una dirección de email válida (ej: tu@ejemplo.com).",
  },
};

// Traduit les erreurs Clerk (anglais par défaut) dans la langue de l'UI, avec
// un message générique de secours pour les codes non répertoriés — jamais de
// texte anglais brut affiché à un utilisateur FR (et vice versa).
export function clerkErrorMessage(err: unknown, fallback: string, locale: Locale = "fr"): string {
  const e = err as { errors?: ClerkApiError[] };
  const first = e.errors?.[0];
  if (!first) return fallback;

  const messages = MESSAGES[locale];
  if (first.code === "form_param_format_invalid" && first.meta?.paramName === "email_address") {
    return messages.form_param_format_invalid_email;
  }

  return messages[first.code ?? ""] ?? fallback;
}
