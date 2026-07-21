"use client";

import { useState } from "react";
import CountrySelect from "@/components/auth/CountrySelect";
import type { Dictionary } from "@/lib/i18n/dictionaries/fr";

interface Props {
  country: string;
  t: Dictionary["onboarding"];
  onChange: (country: string) => void;
  onContinue: () => void;
}

// Demandé une seule fois, à la toute première visite de l'onboarding (donc
// juste après la création du compte) — voir page.tsx, qui vérifie
// /api/user/settings et saute directement cette étape si un pays est déjà
// enregistré. Modifiable ensuite depuis les paramètres du compte.
export default function CountryStep({ country, t, onChange, onContinue }: Props) {
  const [saving, setSaving] = useState(false);

  async function handleContinue() {
    if (!country || saving) return;
    setSaving(true);
    try {
      await fetch("/api/user/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ country }),
      });
    } catch { /* on continue quand même — le pays repartira avec la génération */ }
    setSaving(false);
    onContinue();
  }

  return (
    <div>
      <div className="mb-8 text-center">
        <p className="mono text-xs tracking-widest uppercase mb-3" style={{ color: "#a09a94", letterSpacing: "0.12em" }}>{t.country.kicker}</p>
        <h1 className="mb-2 text-3xl serif" style={{ fontWeight: 500, color: "#1c1917" }}>
          {t.country.title}
        </h1>
        <p className="text-sm" style={{ color: "#78716c" }}>{t.country.subtitle}</p>
      </div>

      <div className="mb-6">
        <CountrySelect value={country} onChange={onChange} />
      </div>

      <button onClick={handleContinue} disabled={!country || saving}
        className="w-full rounded-xl py-3.5 text-sm font-semibold text-white transition hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed"
        style={{ background: "#1c1917" }}>
        {t.country.continue}
      </button>
    </div>
  );
}
