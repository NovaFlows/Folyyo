import { getLocale } from "@/lib/i18n/locale";
import SettingsPageClient from "./SettingsPageClient";

// Server Component : lit la langue via le cookie (comme le reste du
// dashboard) plutôt que via useLocale() côté client — pour que ce soit bien
// le sélecteur de la navbar (qui pose le cookie + router.refresh()) qui
// pilote la langue ici, sans second sélecteur déconnecté sur la page. On ne
// passe que `locale` (une string) au Client Component, pas le dictionnaire :
// t.settings contient des fonctions (emailCurrent, emailCodeLabel).
export default function SettingsPage() {
  const locale = getLocale();
  return <SettingsPageClient locale={locale} />;
}
