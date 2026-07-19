"use client";

import { useEffect, useState } from "react";
import TemplateCard, { type TemplateCardData } from "@/components/portfolio/TemplateCard";
import type { OnboardingData } from "../page";

interface Props {
  profileType: NonNullable<OnboardingData["profileType"]>;
  templateId: string | null;
  styleUrl: string;
  onSelect: (templateId: string | null) => void;
  onStyleUrlChange: (url: string) => void;
  onBack: () => void;
  onContinue: () => void;
}

export default function TemplatePickerStep({ profileType, templateId, styleUrl, onSelect, onStyleUrlChange, onBack, onContinue }: Props) {
  const [items, setItems] = useState<TemplateCardData[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/community/featured?profileType=${encodeURIComponent(profileType)}`)
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setItems(d.items ?? []); })
      .catch(() => { if (!cancelled) setItems([]); });
    return () => { cancelled = true; };
  }, [profileType]);

  if (items === null) {
    return (
      <div className="text-center py-16">
        <p className="text-sm" style={{ color: "#a09a94" }}>Chargement…</p>
      </div>
    );
  }

  const label = templateId ? "Continuer avec ce style" : styleUrl.trim() ? "Continuer avec ce style" : "Continuer sans style de départ";

  return (
    <div>
      <div className="mb-8 text-center">
        <p className="mono text-xs tracking-widest uppercase mb-3" style={{ color: "#a09a94", letterSpacing: "0.12em" }}>02 / style (optionnel)</p>
        <h1 className="mb-2 text-3xl serif" style={{ fontWeight: 500, color: "#1c1917" }}>
          Envie de partir d&apos;un style existant ?
        </h1>
        <p className="text-sm" style={{ color: "#78716c" }}>
          Choisis le style visuel d&apos;un portfolio de la communauté, ou colle l&apos;URL d&apos;un site dont tu aimes l&apos;esthétique — ton contenu reste 100% personnalisé.
        </p>
      </div>

      {items.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 mb-6">
          {items.map((item) => (
            <TemplateCard key={item.id} data={item}
              selected={templateId === item.id}
              onSelect={() => { onSelect(templateId === item.id ? null : item.id); onStyleUrlChange(""); }} />
          ))}
        </div>
      )}

      <div className="mb-8">
        {items.length > 0 && (
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px flex-1" style={{ background: "rgba(0,0,0,0.08)" }} />
            <span className="text-xs" style={{ color: "#a09a94" }}>ou</span>
            <div className="h-px flex-1" style={{ background: "rgba(0,0,0,0.08)" }} />
          </div>
        )}
        <label className="mb-1.5 block text-sm font-medium" style={{ color: "#78716c" }}>
          Copier le style d&apos;un site — ex : apple.com
        </label>
        <input type="text" value={styleUrl}
          onChange={(e) => { onStyleUrlChange(e.target.value); if (e.target.value.trim()) onSelect(null); }}
          placeholder="https://…"
          className="w-full rounded-xl px-4 py-3 text-sm outline-none transition"
          style={{ background: "white", border: `1px solid ${styleUrl.trim() ? "#c9a96e" : "rgba(0,0,0,0.1)"}`, color: "#1c1917" }} />
        <p className="mono mt-1.5 text-xs" style={{ color: "#a09a94" }}>
          L&apos;IA s&apos;inspire de la palette et de la typographie du site — jamais de son contenu ni de ses images.
        </p>
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
          {label}
        </button>
      </div>
    </div>
  );
}
