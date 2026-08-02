"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Portfolio, PortfolioStatus } from "@/types";
import { PROFILE_LABEL } from "@/lib/profile-labels";
import { getDictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/types";

export default function PortfolioCard({ portfolio: p, views, locale, selected, onSelect }: {
  portfolio: Portfolio; views?: { total: number; last7d: number }; locale: Locale;
  // Mode "sélectionnable" (dashboard multi-portfolios admin) : la carte devient
  // cliquable pour choisir quel portfolio afficher dans l'aperçu latéral.
  selected?: boolean; onSelect?: () => void;
}) {
  // Les fonctions du dictionnaire (t.views, t.count…) ne sont pas
  // sérialisables à travers la frontière Server→Client Component — on reçoit
  // juste `locale` (une string) et on recalcule le dictionnaire ici, côté
  // client, plutôt que de passer l'objet t.dashboard depuis le Server
  // Component parent (ça plantait le rendu de /dashboard).
  const t = getDictionary(locale).dashboard;
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteError, setDeleteError] = useState(false);
  const statusColor: Record<PortfolioStatus, string> = {
    draft: "#a09a94", generating: "#d97706", deploying: "#0891b2",
    live: "#22a06b", editing: "#d97706", error: "#dc2626",
  };
  const statusLabel = t.status[p.status] ?? t.status.generating;
  const color = statusColor[p.status] ?? statusColor.generating;
  const shortSlug = p.slug ?? p.id.slice(0, 8);
  const isLive = p.status === "live";

  async function handleDelete() {
    setDeleting(true);
    setDeleteError(false);
    try {
      const res = await fetch(`/api/portfolio/${p.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      // Échec réseau/serveur : on rouvre la possibilité de réessayer plutôt
      // que de laisser le bouton bloqué indéfiniment sur "Suppression…".
      setDeleting(false);
      setDeleteError(true);
    }
  }

  return (
    <div onClick={onSelect}
      className={`rounded-2xl p-6 transition hover:-translate-y-0.5 relative ${onSelect ? "cursor-pointer" : ""}`}
      style={{
        background: "#f0ece6",
        border: selected ? "1px solid #c9a96e" : "1px solid rgba(0,0,0,0.06)",
        boxShadow: selected ? "0 0 0 1px #c9a96e" : undefined,
      }}>

      {/* Profile + status + suppression, dans une seule ligne flex. La
          confirmation de suppression passe désormais par une modale centrée
          (voir plus bas) plutôt que par un changement de libellé inline sur
          ce bouton — celui-ci garde donc toujours la même largeur. */}
      <div className="mb-4 flex items-center justify-between gap-2">
        <span className="mono rounded px-1.5 py-0.5 text-xs shrink-0"
          style={{ background: "rgba(0,0,0,0.04)", color: "#a09a94" }}>
          {PROFILE_LABEL[p.profile_type] ?? p.profile_type}
        </span>
        <div className="flex items-center gap-3 min-w-0">
          <span className="flex items-center gap-1.5 text-xs font-medium shrink-0" style={{ color }}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
            {statusLabel}
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); setConfirmOpen(true); }}
            disabled={deleting}
            title={t.deleteTitle}
            className="shrink-0 rounded-lg px-2 py-1 text-xs transition hover:opacity-80 disabled:opacity-40"
            style={{ background: "transparent", color: "#c8c4bf", border: "1px solid transparent" }}>
            ✕
          </button>
        </div>
      </div>

      {/* Name */}
      <h3 className="font-semibold mb-1" style={{ color: "#1c1917" }}>{p.name}</h3>

      {/* Slug URL in mono */}
      <p className={`mono text-xs ${isLive ? "mb-1" : "mb-5"}`} style={{ color: "#c8c4bf" }}>
        folyo.page/<span style={{ color: "#a09a94" }}>{shortSlug}</span>
      </p>

      {/* Compteur de vues — toujours visible dès que le site est en ligne (même
          à 0), sinon la fonctionnalité est invisible tant qu'il n'y a pas eu
          de première vue et personne ne sait où la chercher. */}
      {isLive && (
        <p className="mono text-xs mb-5 flex items-center gap-1.5" style={{ color: "#a09a94" }}>
          <span aria-hidden="true">👁</span>
          {views && views.total > 0 ? (
            <>
              {t.views(views.total)}
              {views.last7d > 0 && <span style={{ color: "#22a06b" }}>· {t.viewsThisWeek(views.last7d)}</span>}
            </>
          ) : (
            t.noViewsYet
          )}
        </p>
      )}

      <div className="flex gap-2">
        <Link href={`/portfolio/${p.id}`} onClick={(e) => e.stopPropagation()}
          className="flex-1 rounded-xl py-2 text-center text-xs font-medium transition hover:opacity-70"
          style={{ border: "1px solid rgba(0,0,0,0.08)", color: "#78716c" }}>
          {t.manage}
        </Link>
        {isLive && (
          <a href={`/${shortSlug}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
            className="flex-1 rounded-xl py-2 text-center text-xs font-medium transition hover:opacity-70"
            style={{ background: "rgba(201,169,110,0.1)", color: "#c9a96e" }}>
            {t.viewSite}
          </a>
        )}
      </div>

      {/* Modale de confirmation de suppression — même gabarit que ReviewPopup
          (overlay fixed + voile + carte centrée crème). `onClick` sur le
          conteneur stoppe la propagation pour ne pas déclencher `onSelect`
          de la carte parente en mode sélectionnable. */}
      {confirmOpen && (
        <div onClick={(e) => e.stopPropagation()}
          style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
          role="dialog" aria-modal="true">
          <div onClick={deleting ? undefined : () => { setConfirmOpen(false); setDeleteError(false); }}
            style={{ position: "absolute", inset: 0, background: "rgba(28,25,23,0.55)" }} />

          <div className="rounded-2xl p-6" style={{
            position: "relative", width: "min(380px, 100%)",
            background: "#f0ece6", border: "1px solid rgba(0,0,0,0.08)",
            boxShadow: "0 24px 60px -20px rgba(28,25,23,0.45)",
          }}>
            <h3 className="serif mb-2" style={{ fontSize: "1.15rem", fontWeight: 500, color: "#1c1917" }}>
              {t.deleteModalTitle}
            </h3>
            <p className="text-sm mb-5" style={{ color: "#78716c" }}>{t.deleteModalDesc}</p>

            {deleteError && <p className="text-sm mb-4" style={{ color: "#dc2626" }}>{t.deleteModalError}</p>}

            <div className="flex items-center gap-4">
              <button onClick={handleDelete} disabled={deleting}
                className="rounded-xl px-5 py-2 text-sm font-semibold text-white transition hover:opacity-85 disabled:opacity-60"
                style={{ background: "#dc2626", border: "none", cursor: "pointer" }}>
                {deleting ? t.deleteModalLoading : t.deleteModalConfirm}
              </button>
              <button onClick={() => { setConfirmOpen(false); setDeleteError(false); }} disabled={deleting}
                className="text-sm transition hover:opacity-70 disabled:opacity-40"
                style={{ color: "#a09a94", background: "none", border: "none", cursor: "pointer" }}>
                {t.deleteModalCancel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
