import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";
import SupportForm from "./SupportForm";

// Server Component : lit la langue via le cookie (comme le reste du
// dashboard) plutôt que via useLocale() côté client — pour que ce soit bien
// le sélecteur de la navbar (qui pose le cookie + router.refresh()) qui
// pilote la langue ici, sans second sélecteur déconnecté sur la page.
export default function SupportPage() {
  const locale = getLocale();
  const t = getDictionary(locale).support;

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <p className="mono text-xs tracking-widest uppercase mb-2" style={{ color: "#a09a94", letterSpacing: "0.12em" }}>{t.kicker}</p>
        <h1 className="text-2xl serif" style={{ fontWeight: 500, color: "#1c1917" }}>{t.title}</h1>
        <p className="mt-2 text-sm" style={{ color: "#78716c" }}>{t.subtitle}</p>
      </div>

      <SupportForm t={t} />
    </div>
  );
}
