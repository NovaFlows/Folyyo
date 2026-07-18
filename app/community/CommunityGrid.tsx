"use client";

import { useState } from "react";
import TemplateCard, { type TemplateCardData } from "@/components/portfolio/TemplateCard";

const FILTERS: { value: string; label: string }[] = [
  { value: "all",       label: "Tous" },
  { value: "developer", label: "Développeur" },
  { value: "artist",    label: "Artiste" },
  { value: "fashion",   label: "Mode" },
  { value: "musicien",  label: "Musicien" },
  { value: "other",     label: "Autre" },
];

export default function CommunityGrid({ items }: { items: TemplateCardData[] }) {
  const [filter, setFilter] = useState("all");
  const visible = filter === "all" ? items : items.filter((i) => i.profileType === filter);

  if (items.length === 0) {
    return (
      <p className="text-sm" style={{ color: "#78716c" }}>
        Aucun portfolio mis en avant pour l&apos;instant — reviens bientôt !
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
        <p className="text-sm" style={{ color: "#78716c" }}>Aucun portfolio dans cette catégorie pour l&apos;instant.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((item) => (
            <TemplateCard key={item.id} data={item} showPreviewLink />
          ))}
        </div>
      )}
    </div>
  );
}
