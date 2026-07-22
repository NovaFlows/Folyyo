"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Globe } from "lucide-react";
import { LOCALE_COOKIE, type Locale } from "@/lib/i18n/types";

const LANGUAGES: { code: Locale; label: string }[] = [
  { code: "fr", label: "Français" },
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "de", label: "Deutsch" },
];

// Sélecteur de langue — une icône "globe" sobre (lucide-react, pas d'emoji)
// qui ouvre un petit menu déroulant listant FR/EN/ES, la langue actuelle
// étant mise en évidence. Remplace l'ancien bascule textuel "FR / EN" —
// pose le cookie, puis :
// - par défaut, force un router.refresh() pour que les Server Components
//   (landing, dashboard…) qui lisent ce cookie via getLocale() se re-rendent
//   dans la nouvelle langue, sans rechargement complet de page ;
// - si `onChange` est fourni (pages 100% client comme login/signup, qui
//   n'ont pas de contenu Server Component à rafraîchir), on l'appelle à la
//   place — voir lib/i18n/useLocale.ts.
export default function LanguageToggle({ locale, dark, onChange }: { locale: Locale; dark?: boolean; onChange?: (next: Locale) => void }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocMouseDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function switchTo(next: Locale) {
    setOpen(false);
    if (next === locale) return;
    if (onChange) { onChange(next); return; }
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=${60 * 60 * 24 * 365}`;
    router.refresh();
  }

  const iconColor = dark ? "rgba(248,245,240,0.7)" : "#78716c";
  const iconColorHover = dark ? "#f8f5f0" : "#1c1917";

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Choisir la langue"
        aria-expanded={open}
        style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          width: 32, height: 32, borderRadius: "0.5rem", border: "none",
          background: open ? (dark ? "rgba(248,245,240,0.1)" : "rgba(28,25,23,0.06)") : "transparent",
          color: open ? iconColorHover : iconColor, cursor: "pointer", transition: "background 0.15s, color 0.15s",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = iconColorHover; }}
        onMouseLeave={(e) => { if (!open) e.currentTarget.style.color = iconColor; }}
      >
        <Globe size={18} strokeWidth={1.5} />
      </button>

      {open && (
        <div
          role="menu"
          style={{
            position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 100,
            background: "white", borderRadius: "0.75rem", border: "1px solid rgba(0,0,0,0.08)",
            boxShadow: "0 8px 28px rgba(0,0,0,0.14)", padding: 4, minWidth: 140,
          }}
        >
          {LANGUAGES.map((l) => {
            const active = l.code === locale;
            return (
              <button
                key={l.code}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                onClick={() => switchTo(l.code)}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem",
                  width: "100%", padding: "0.5rem 0.625rem", borderRadius: "0.5rem", border: "none",
                  background: active ? "rgba(201,169,110,0.12)" : "transparent",
                  color: active ? "#c9a96e" : "#44403c",
                  fontSize: "0.8125rem", fontWeight: active ? 600 : 400, cursor: "pointer", textAlign: "left",
                }}
                onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "rgba(0,0,0,0.04)"; }}
                onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}
              >
                <span>{l.label}</span>
                {active && <span style={{ fontSize: "0.75rem" }}>✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
