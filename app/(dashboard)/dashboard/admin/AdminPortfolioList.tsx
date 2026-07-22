"use client";

import { useState } from "react";
import type { Portfolio } from "@/types";
import { PROFILE_LABEL } from "@/lib/profile-labels";

function siteMeta(p: Portfolio): { name?: string; title?: string } {
  const json = p.site_json as { meta?: { name?: string; title?: string } } | null;
  return json?.meta ?? {};
}

export default function AdminPortfolioList({ portfolios }: { portfolios: Portfolio[] }) {
  const [rows, setRows] = useState(portfolios);
  const [pending, setPending] = useState<string | null>(null);

  async function toggle(id: string, next: boolean) {
    setPending(id);
    const prev = rows;
    setRows((r) => r.map((p) => (p.id === id ? { ...p, featured: next, featured_at: next ? new Date().toISOString() : null } : p)));
    try {
      const res = await fetch(`/api/admin/portfolios/${id}/feature`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ featured: next }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setRows(prev); // rollback
    } finally {
      setPending(null);
    }
  }

  if (rows.length === 0) {
    return <p className="text-sm" style={{ color: "#78716c" }}>Aucun portfolio en ligne pour l&apos;instant.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {rows.map((p) => {
        const meta = siteMeta(p);
        const shortSlug = p.slug ?? p.id.slice(0, 8);
        return (
          <div key={p.id} className="flex items-center justify-between gap-4 rounded-2xl p-4"
            style={{ background: "#f0ece6", border: "1px solid rgba(0,0,0,0.06)" }}>
            <div className="flex items-center gap-4 min-w-0">
              <span className="mono rounded px-1.5 py-0.5 text-xs shrink-0"
                style={{ background: "rgba(0,0,0,0.04)", color: "#a09a94" }}>
                {PROFILE_LABEL[p.profile_type] ?? p.profile_type}
              </span>
              <div className="min-w-0">
                <p className="font-semibold truncate" style={{ color: "#1c1917" }}>{meta.name ?? p.name}</p>
                <p className="mono text-xs truncate" style={{ color: "#c8c4bf" }}>
                  {meta.title ? `${meta.title} · ` : ""}folyo.page/<span style={{ color: "#a09a94" }}>{shortSlug}</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <a href={`/${shortSlug}`} target="_blank" rel="noopener noreferrer"
                className="text-xs font-medium transition hover:opacity-70" style={{ color: "#c9a96e" }}>
                Voir ↗
              </a>
              <button onClick={() => toggle(p.id, !p.featured)} disabled={pending === p.id}
                className="rounded-full px-4 py-1.5 text-xs font-medium transition hover:opacity-80 disabled:opacity-50"
                style={{
                  background: p.featured ? "#1c1917" : "transparent",
                  color: p.featured ? "white" : "#78716c",
                  border: `1px solid ${p.featured ? "#1c1917" : "rgba(0,0,0,0.12)"}`,
                }}>
                {pending === p.id ? "…" : p.featured ? "★ En avant" : "☆ Mettre en avant"}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
