"use client";

import { PROFILE_LABEL } from "@/lib/profile-labels";
import type { Dictionary } from "@/lib/i18n/dictionaries/fr";

export interface TemplateCardData {
  id: string;
  profileType: string;
  name: string;
  title: string;
  tagline: string;
  slug: string | null;
  theme: {
    primary_color: string;
    background_color: string;
    accent_color: string;
    font_heading: string;
  };
}

export default function TemplateCard({ data, selected, onSelect, showPreviewLink, t }: {
  data: TemplateCardData;
  selected?: boolean;
  onSelect?: () => void;
  showPreviewLink?: boolean;
  t?: Dictionary["templateCard"];
}) {
  const { profileType, name, title, tagline, slug, theme, id } = data;
  const tc = t ?? {
    font: "police", selected: "✓ Sélectionné", chooseStyle: "Choisir ce style",
    viewSite: "Voir le site ↗", useStyle: "Utiliser ce style",
  };

  return (
    <div
      className="rounded-2xl p-5 transition"
      style={{
        background: "#f0ece6",
        border: `1px solid ${selected ? "#c9a96e" : "rgba(0,0,0,0.06)"}`,
        outline: selected ? "2px solid #c9a96e" : "none",
        outlineOffset: -1,
        cursor: onSelect ? "pointer" : "default",
      }}
      onClick={onSelect}
    >
      <div className="mb-4 flex items-center justify-between">
        <span className="mono rounded px-1.5 py-0.5 text-xs" style={{ background: "rgba(0,0,0,0.04)", color: "#a09a94" }}>
          {PROFILE_LABEL[profileType] ?? profileType}
        </span>
        <div className="flex gap-1">
          {[theme.primary_color, theme.background_color, theme.accent_color].map((c, i) => (
            <span key={i} className="h-4 w-4 rounded-full" style={{ background: c, border: "1px solid rgba(0,0,0,0.1)" }} />
          ))}
        </div>
      </div>

      <h3 className="font-semibold mb-1 truncate" style={{ color: "#1c1917" }}>{name}</h3>
      {title && <p className="text-xs mb-1 truncate" style={{ color: "#c9a96e" }}>{title}</p>}
      {tagline && <p className="text-xs mb-4 line-clamp-2" style={{ color: "#78716c" }}>{tagline}</p>}

      <p className="mono text-xs mb-4" style={{ color: "#c8c4bf" }}>
        {tc.font} <span style={{ color: "#a09a94" }}>{theme.font_heading}</span>
      </p>

      <div className="flex gap-2">
        {onSelect && (
          <button
            className="flex-1 rounded-xl py-2 text-center text-xs font-medium transition hover:opacity-70"
            style={{
              background: selected ? "#1c1917" : "rgba(201,169,110,0.1)",
              color: selected ? "white" : "#c9a96e",
            }}>
            {selected ? tc.selected : tc.chooseStyle}
          </button>
        )}
        {showPreviewLink && slug && (
          <a href={`/${slug}`} target="_blank" rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex-1 rounded-xl py-2 text-center text-xs font-medium transition hover:opacity-70"
            style={{ border: "1px solid rgba(0,0,0,0.08)", color: "#78716c" }}>
            {tc.viewSite}
          </a>
        )}
        {showPreviewLink && (
          <a href={`/onboarding?templateId=${id}`}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 rounded-xl py-2 text-center text-xs font-medium transition hover:opacity-70"
            style={{ background: "rgba(201,169,110,0.1)", color: "#c9a96e" }}>
            {tc.useStyle}
          </a>
        )}
      </div>
    </div>
  );
}
