"use client";

import { useState, useEffect } from "react";
import { Star, X } from "lucide-react";
import { getDictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/types";

// Popup de notation (étoiles + commentaire optionnel), proposé une seule fois
// par compte. `eligible` est calculé côté serveur (page.tsx) : au moins 1 jour
// depuis l'inscription ET aucun avis déjà en base — cette garde-là ne dépend
// jamais du localStorage, qui ne sert qu'au cooldown "fermé sans noter".
const DISMISS_STORAGE_KEY = "folyyo_review_dismissed_until";
const COOLDOWN_DAYS = 7;

type Status = "idle" | "submitting" | "success" | "error";

export default function ReviewPopup({ locale, eligible }: { locale: Locale; eligible: boolean }) {
  // Slice de dictionnaire (que des strings) recalculé côté client à partir de
  // `locale` — jamais un objet contenant des fonctions passé depuis le Server
  // Component parent (voir PortfolioCard pour le même principe).
  const t = getDictionary(locale).reviewPopup;

  const [visible, setVisible] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  useEffect(() => {
    if (!eligible) return;
    try {
      const until = localStorage.getItem(DISMISS_STORAGE_KEY);
      if (until && Date.now() < Number(until)) return; // cooldown en cours
    } catch { /* stockage indisponible — on affiche quand même */ }
    setVisible(true);
  }, [eligible]);

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_STORAGE_KEY, String(Date.now() + COOLDOWN_DAYS * 24 * 60 * 60 * 1000));
    } catch { /* stockage indisponible — pas grave, sera reproposé plus tôt */ }
    setVisible(false);
  }

  async function handleSubmit() {
    if (rating < 1 || status === "submitting") return;
    setStatus("submitting");
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, comment: comment.trim() || undefined }),
      });
      // 409 = déjà noté (course avec un autre onglet par ex.) — on considère
      // ça comme un succès du point de vue de l'utilisateur, rien à renvoyer.
      if (!res.ok && res.status !== 409) throw new Error();
      setStatus("success");
      try { localStorage.removeItem(DISMISS_STORAGE_KEY); } catch { /* ignore */ }
      setTimeout(() => setVisible(false), 1600);
    } catch {
      setStatus("error");
    }
  }

  if (!visible) return null;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9998, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      aria-live="polite" role="dialog" aria-modal="true">
      {/* Voile de fond — ferme (avec cooldown) au clic en dehors */}
      <div onClick={status === "submitting" ? undefined : dismiss}
        style={{ position: "absolute", inset: 0, background: "rgba(28,25,23,0.55)" }} />

      <div className="rounded-2xl p-6" style={{
        position: "relative", width: "min(380px, 100%)",
        background: "#f0ece6", border: "1px solid rgba(0,0,0,0.08)",
        boxShadow: "0 24px 60px -20px rgba(28,25,23,0.45)",
      }}>
        <button onClick={dismiss} aria-label={t.close}
          className="absolute top-4 right-4 transition hover:opacity-70"
          style={{ color: "#a09a94", background: "none", border: "none", cursor: "pointer" }}>
          <X size={18} strokeWidth={1.75} />
        </button>

        {status === "success" ? (
          <p className="text-sm font-medium text-center" style={{ color: "#1c1917", padding: "24px 0" }}>{t.success}</p>
        ) : (
          <>
            <h3 className="serif mb-2 pr-6" style={{ fontSize: "1.15rem", fontWeight: 500, color: "#1c1917" }}>{t.title}</h3>
            <p className="text-sm mb-5" style={{ color: "#78716c" }}>{t.subtitle}</p>

            <div className="flex items-center gap-1.5 mb-4" onMouseLeave={() => setHoverRating(0)}>
              {[1, 2, 3, 4, 5].map((n) => {
                const active = n <= (hoverRating || rating);
                return (
                  <button key={n} type="button" onClick={() => setRating(n)} onMouseEnter={() => setHoverRating(n)}
                    aria-label={`${n} étoile${n > 1 ? "s" : ""}`}
                    className="transition hover:opacity-80"
                    style={{ background: "none", border: "none", cursor: "pointer", padding: 2, lineHeight: 0 }}>
                    <Star size={28} strokeWidth={1.5} color="#c9a96e" fill={active ? "#c9a96e" : "none"} />
                  </button>
                );
              })}
            </div>

            {/* Le commentaire n'apparaît qu'après un premier clic sur une étoile */}
            {rating > 0 && (
              <div className="flex flex-col gap-3">
                <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3}
                  placeholder={t.commentPlaceholder}
                  className="w-full rounded-xl p-3 text-sm outline-none"
                  style={{ background: "white", border: "1px solid rgba(0,0,0,0.1)", color: "#1c1917", resize: "vertical" }} />

                {status === "error" && <p className="text-sm" style={{ color: "#dc2626" }}>{t.error}</p>}

                <div className="flex items-center gap-4">
                  <button onClick={handleSubmit} disabled={status === "submitting"}
                    className="rounded-xl px-5 py-2 text-sm font-semibold text-white transition hover:opacity-85 disabled:opacity-60"
                    style={{ background: "#1c1917", border: "none", cursor: "pointer" }}>
                    {status === "submitting" ? t.submitting : t.submit}
                  </button>
                  <button onClick={dismiss} className="text-sm transition hover:opacity-70"
                    style={{ color: "#a09a94", background: "none", border: "none", cursor: "pointer" }}>
                    {t.later}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
