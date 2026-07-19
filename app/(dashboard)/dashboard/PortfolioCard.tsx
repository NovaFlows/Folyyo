"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Portfolio, PortfolioStatus } from "@/types";
import { PROFILE_LABEL } from "@/lib/profile-labels";

const STATUS_CONFIG: Record<PortfolioStatus, { label: string; color: string }> = {
  draft:      { label: "Brouillon",          color: "#a09a94" },
  generating: { label: "Génération…",        color: "#d97706" },
  deploying:  { label: "Déploiement…",       color: "#0891b2" },
  live:       { label: "En ligne",           color: "#22a06b" },
  editing:    { label: "En cours d'édition…", color: "#d97706" },
  error:      { label: "Erreur",             color: "#dc2626" },
};

export default function PortfolioCard({ portfolio: p }: { portfolio: Portfolio }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const status = STATUS_CONFIG[p.status] ?? STATUS_CONFIG.draft;
  const shortSlug = p.slug ?? p.id.slice(0, 8);

  async function handleDelete() {
    if (!confirm) { setConfirm(true); return; }
    setDeleting(true);
    await fetch(`/api/portfolio/${p.id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="rounded-2xl p-6 transition hover:-translate-y-0.5 relative"
      style={{ background: "#f0ece6", border: "1px solid rgba(0,0,0,0.06)" }}>

      {/* Delete button */}
      <button
        onClick={handleDelete}
        disabled={deleting}
        title={confirm ? "Cliquer encore pour confirmer" : "Supprimer"}
        className="absolute top-4 right-4 rounded-lg px-2 py-1 text-xs transition hover:opacity-80 disabled:opacity-40"
        style={{
          background: confirm ? "rgba(220,38,38,0.08)" : "transparent",
          color: confirm ? "#dc2626" : "#c8c4bf",
          border: confirm ? "1px solid rgba(220,38,38,0.15)" : "1px solid transparent",
        }}
        onBlur={() => setConfirm(false)}>
        {deleting ? "…" : confirm ? "Confirmer ?" : "✕"}
      </button>

      {/* Profile + status row */}
      <div className="mb-4 flex items-center justify-between pr-8">
        <span className="mono rounded px-1.5 py-0.5 text-xs"
          style={{ background: "rgba(0,0,0,0.04)", color: "#a09a94" }}>
          {PROFILE_LABEL[p.profile_type] ?? p.profile_type}
        </span>
        <span className="flex items-center gap-1.5 text-xs font-medium" style={{ color: status.color }}>
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: status.color }} />
          {status.label}
        </span>
      </div>

      {/* Name */}
      <h3 className="font-semibold mb-1" style={{ color: "#1c1917" }}>{p.name}</h3>

      {/* Slug URL in mono */}
      <p className="mono text-xs mb-5" style={{ color: "#c8c4bf" }}>
        folyyo.com/<span style={{ color: "#a09a94" }}>{shortSlug}</span>
      </p>

      <div className="flex gap-2">
        <Link href={`/portfolio/${p.id}`}
          className="flex-1 rounded-xl py-2 text-center text-xs font-medium transition hover:opacity-70"
          style={{ border: "1px solid rgba(0,0,0,0.08)", color: "#78716c" }}>
          Gérer
        </Link>
        {p.deployment_url && (
          <a href={p.deployment_url} target="_blank" rel="noopener noreferrer"
            className="flex-1 rounded-xl py-2 text-center text-xs font-medium transition hover:opacity-70"
            style={{ background: "rgba(201,169,110,0.1)", color: "#c9a96e" }}>
            Voir le site ↗
          </a>
        )}
      </div>
    </div>
  );
}
