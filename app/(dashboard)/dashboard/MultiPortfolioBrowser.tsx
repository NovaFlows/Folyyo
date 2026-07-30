"use client";

import { useState } from "react";
import type { Portfolio } from "@/types";
import type { Locale } from "@/lib/i18n/types";
import PortfolioCard from "./PortfolioCard";

// Cas multi-portfolios (comptes admin/lifetime uniquement) : la grille de cartes
// à gauche, cliquables, et un aperçu en direct du portfolio sélectionné à droite
// (grand écran). Pratique pour parcourir/travailler les portfolios de démo de la
// Communauté sans ouvrir chacun dans un onglet.
export default function MultiPortfolioBrowser({ portfolios, viewCounts, locale }: {
  portfolios: Portfolio[];
  viewCounts: Record<string, { total: number; last7d: number }>;
  locale: Locale;
}) {
  const firstLive = portfolios.find((p) => p.status === "live" && p.slug);
  const [selectedId, setSelectedId] = useState<string | null>(firstLive?.id ?? null);
  const selected = portfolios.find((p) => p.id === selectedId);
  const canPreview = Boolean(selected && selected.status === "live" && selected.slug);

  return (
    <div className="flex flex-col gap-6 lg:flex-row" style={{ alignItems: "flex-start" }}>
      <div className="grid gap-4 sm:grid-cols-2 lg:min-w-0 lg:flex-1" style={{ alignSelf: "flex-start" }}>
        {portfolios.map((p) => (
          <PortfolioCard
            key={p.id} portfolio={p} views={viewCounts[p.id]} locale={locale}
            selected={p.id === selectedId}
            onSelect={p.status === "live" && p.slug ? () => setSelectedId(p.id) : undefined}
          />
        ))}
      </div>

      {canPreview && selected && (
        <div className="hidden lg:block lg:w-[420px] lg:shrink-0" style={{ alignSelf: "flex-start" }}>
          <div className="overflow-hidden rounded-2xl border flex flex-col"
            style={{ borderColor: "rgba(0,0,0,0.08)", height: "calc(100vh - 15rem)", minHeight: 320, maxHeight: 640, position: "sticky", top: "1.5rem" }}>
            <div className="flex shrink-0 items-center gap-3 border-b px-4 py-3" style={{ borderColor: "rgba(0,0,0,0.06)", background: "#f0ece6" }}>
              <div className="flex gap-1.5">
                <div className="h-3 w-3 rounded-full" style={{ background: "rgba(0,0,0,0.1)" }} />
                <div className="h-3 w-3 rounded-full" style={{ background: "rgba(0,0,0,0.1)" }} />
                <div className="h-3 w-3 rounded-full" style={{ background: "rgba(0,0,0,0.1)" }} />
              </div>
              <div className="flex-1 rounded-md px-3 py-1 text-center text-xs" style={{ background: "rgba(255,255,255,0.7)", color: "#78716c", fontFamily: "monospace" }}>
                folyo.page/{selected.slug}
              </div>
            </div>
            {/* key={slug} force le rechargement de l'iframe au changement de sélection */}
            <iframe key={selected.slug} src={`/${selected.slug}`} title={`Aperçu de folyo.page/${selected.slug}`}
              style={{ width: "100%", flex: 1, minHeight: 0, border: "none", display: "block" }} />
          </div>
        </div>
      )}
    </div>
  );
}
