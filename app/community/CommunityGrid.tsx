"use client";

import { useState } from "react";
import TemplateCard, { type TemplateCardData } from "@/components/portfolio/TemplateCard";
import type { Dictionary } from "@/lib/i18n/dictionaries/fr";

export default function CommunityGrid({ items, t, templateCardT }: { items: TemplateCardData[]; t: Dictionary["community"]; templateCardT: Dictionary["templateCard"] }) {
  const [filter, setFilter] = useState("all");
  const FILTERS: { value: string; label: string }[] = [
    { value: "all",         label: t.filters.all },
    { value: "developer",   label: t.filters.developer },
    { value: "designer",    label: t.filters.designer },
    { value: "photographe", label: t.filters.photographe },
    { value: "artist",      label: t.filters.artist },
    { value: "fashion",     label: t.filters.fashion },
    { value: "musicien",    label: t.filters.musicien },
    { value: "other",       label: t.filters.other },
  ];
  const visible = filter === "all" ? items : items.filter((i) => i.profileType === filter);

  if (items.length === 0) {
    return (
      <p className="text-sm" style={{ color: "#78716c" }}>
        {t.emptyAll}
      </p>
    );
  }

  return (
    <div>
      <div className="mb-8 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button key={f.value} onClick={() => setFilter(f.value)}
            className="rounded-full px-4 py-1.5 text-xs font-medium transition hover:opacity-80"
            style={{
              background: filter === f.value ? "#1c1917" : "#f0ece6",
              color: filter === f.value ? "white" : "#78716c",
              border: `1px solid ${filter === f.value ? "#1c1917" : "rgba(0,0,0,0.06)"}`,
            }}>
            {f.label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="text-sm" style={{ color: "#78716c" }}>{t.emptyFiltered}</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((item) => (
            <TemplateCard key={item.id} data={item} showPreviewLink t={templateCardT} />
          ))}
        </div>
      )}
    </div>
  );
}
