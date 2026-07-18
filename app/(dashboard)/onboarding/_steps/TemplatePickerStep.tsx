"use client";

import { useEffect, useState } from "react";
import TemplateCard, { type TemplateCardData } from "@/components/portfolio/TemplateCard";
import type { OnboardingData } from "../page";

interface Props {
  profileType: NonNullable<OnboardingData["profileType"]>;
  templateId: string | null;
  onSelect: (templateId: string | null) => void;
  onBack: () => void;
  onContinue: () => void;
}

export default function TemplatePickerStep({ profileType, templateId, onSelect, onBack, onContinue }: Props) {
  const [items, setItems] = useState<TemplateCardData[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/community/featured?profileType=${encodeURIComponent(profileType)}`)
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setItems(d.items ?? []); })
      .catch(() => { if (!cancelled) setItems([]); });
    return () => { cancelled = true; };
  }, [profileType]);

  // Rien à proposer (encore aucun portfolio featuré pour ce profil) → on ne bloque jamais le flux
  useEffect(() => {
    if (items && items.length === 0) onContinue();
  }, [items, onContinue]);

  if (items === null || items.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-sm" style={{ color: "#a09a94" }}>Chargement…</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 text-center">
        <p className="mono text-xs tracking-widest uppercase mb-3" style={{ color: "#a09a94", letterSpacing: "0.12em" }}>02 / style (optionnel)</p>
        <h1 className="mb-2 text-3xl serif" style={{ fontWeight: 500, color: "#1c1917" }}>
          Envie de partir d&apos;un style existant ?
        </h1>
        <p className="text-sm" style={{ color: "#78716c" }}>
          Choisis le style visuel d&apos;un portfolio de la communauté — ton contenu reste 100% personnalisé.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 mb-8">
        {items.map((item) => (
          <TemplateCard key={item.id} data={item}
            selected={templateId === item.id}
            onSelect={() => onSelect(templateId === item.id ? null : item.id)} />
        ))}
      </div>

      <div className="flex gap-3">
        <button onClick={onBack}
          className="rounded-full px-6 py-3 text-sm font-medium transition hover:opacity-70"
          style={{ border: "1px solid rgba(0,0,0,0.1)", color: "#78716c" }}>
          ← Retour
        </button>
        <button onClick={onContinue}
          className="flex-1 rounded-full px-6 py-3 text-sm font-medium text-white transition hover:opacity-80"
          style={{ background: "#1c1917" }}>
          {templateId ? "Continuer avec ce style" : "Continuer sans template"}
        </button>
      </div>
    </div>
  );
}
