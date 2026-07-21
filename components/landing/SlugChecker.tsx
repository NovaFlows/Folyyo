"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getDictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/types";

// Vérificateur de disponibilité de slug dans le hero — plutôt qu'un simple
// bouton "Créer mon portfolio", on laisse le visiteur taper le nom qu'il veut
// tout de suite (comme un check de nom de domaine). S'il est libre, on
// propose de rediriger vers l'inscription avec ce nom déjà choisi (repris
// via sessionStorage à l'inscription puis à l'onboarding — voir
// app/(auth)/signup/page.tsx et app/(dashboard)/onboarding/page.tsx).
//
// Reçoit `locale` (une string) plutôt que le dictionnaire déjà résolu :
// t.hero.slugAvailableMsg est une fonction, et une fonction dans un objet
// passé en prop d'un Server Component vers un Client Component casse la
// sérialisation RSC ("Functions cannot be passed directly to Client
// Components") — on recalcule donc le dictionnaire ici, côté client.
export default function SlugChecker({ locale }: { locale: Locale }) {
  const t = getDictionary(locale).hero;
  const router = useRouter();
  const [slug, setSlug] = useState("");
  const [status, setStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");

  useEffect(() => {
    if (!slug || slug.length < 3) { setStatus("idle"); return; }
    setStatus("checking");
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/portfolio/check-slug?slug=${encodeURIComponent(slug)}`);
        const { available } = await res.json();
        setStatus(available ? "available" : "taken");
      } catch {
        setStatus("idle");
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [slug]);

  function goSignup() {
    router.push(`/signup?slug=${encodeURIComponent(slug)}`);
  }

  const borderColor = status === "taken" ? "#dc2626" : status === "available" ? "#c9a96e" : "rgba(0,0,0,0.1)";

  return (
    <div className="w-full max-w-md">
      <div className="flex items-center rounded-2xl transition"
        style={{ background: "white", border: `1px solid ${borderColor}`, boxShadow: "0 8px 32px rgba(28,25,23,0.08)" }}>
        <span className="mono pl-5 text-sm shrink-0" style={{ color: "#a09a94" }}>folyyo.com/</span>
        <input
          type="text"
          value={slug}
          onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 30))}
          onKeyDown={(e) => { if (e.key === "Enter" && status === "available") goSignup(); }}
          placeholder={t.slugPlaceholder}
          className="mono w-full bg-transparent py-4 pr-2 text-sm outline-none"
          style={{ color: "#1c1917" }}
        />
        <span className="pr-4 text-xs shrink-0">
          {status === "checking" && <span style={{ color: "#a09a94" }}>…</span>}
          {status === "available" && <span style={{ color: "#c9a96e" }}>✓</span>}
          {status === "taken" && <span style={{ color: "#dc2626" }}>✗</span>}
        </span>
      </div>

      {status === "idle" && (
        <p className="mt-2 text-xs" style={{ color: "#a09a94" }}>{t.slugHint}</p>
      )}
      {status === "taken" && (
        <p className="mt-2 text-xs" style={{ color: "#dc2626" }}>{t.slugTaken}</p>
      )}
      {status === "available" && (
        <>
          <p className="mt-2 text-xs font-medium" style={{ color: "#c9a96e" }}>{t.slugAvailableMsg(slug)}</p>
          <button onClick={goSignup}
            className="mt-3 w-full rounded-2xl px-8 py-4 text-sm font-medium text-white transition hover:opacity-90 hover:-translate-y-0.5"
            style={{ background: "#1c1917", boxShadow: "0 8px 32px rgba(28,25,23,0.18)" }}>
            {t.slugAvailableCta}
          </button>
        </>
      )}
    </div>
  );
}
