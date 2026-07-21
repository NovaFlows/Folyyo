"use client";

import { COUNTRIES, languageForCountry } from "@/lib/i18n/country-language";

// Détermine la langue du portfolio généré. Pour l'instant seuls le français,
// l'anglais et l'espagnol sont supportés — si le pays choisi ne correspond à
// aucun des trois, on prévient en anglais (l'utilisateur ne parle
// probablement pas français) que le portfolio sera généré en anglais,
// modifiable ensuite.
// Utilisé à l'inscription (SignupPage) et, en repli (compte GitHub OAuth,
// ou ancien compte sans pays enregistré), à la première visite de
// l'onboarding (CountryStep).
export default function CountrySelect({ value, onChange }: { value: string; onChange: (code: string) => void }) {
  const unsupported = value !== "" && languageForCountry(value) === null;

  return (
    <div>
      <label className="mb-1.5 block text-sm" style={{ color: "#78716c" }}>Pays *</label>
      <div className="flex items-center rounded-xl transition" style={{ background: "white", border: "1px solid rgba(0,0,0,0.1)" }}>
        <select value={value} onChange={(e) => onChange(e.target.value)} required
          className="w-full bg-transparent px-4 py-3 text-sm outline-none"
          style={{ color: value ? "#1c1917" : "#a09a94" }}>
          <option value="" disabled>Sélectionner ton pays…</option>
          {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.fr}</option>)}
        </select>
      </div>
      {unsupported && (
        <p className="mt-1.5 text-xs leading-relaxed text-center" style={{ color: "#d97706" }}>
          We don&apos;t support your language yet — for now, your portfolio will be generated in English. You&apos;ll be able to edit it afterward.
        </p>
      )}
    </div>
  );
}
