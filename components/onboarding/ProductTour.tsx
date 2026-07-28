"use client";

import { useState, useEffect, useLayoutEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";

// Tuto générique (spotlight + flèche) affiché une seule fois par `storageKey`.
// Réutilisé pour la page de gestion du portfolio ET pour l'éditeur visuel : les
// étapes (cible + texte) et les libellés sont fournis par l'appelant. Purement
// client, sans backend — un drapeau localStorage suffit à ne pas le remontrer.
// Se dégrade proprement si une cible est absente (carte centrée sans spotlight).

export interface TourStep {
  target: string | null; // sélecteur CSS de l'élément à surligner ; null = carte centrée (intro)
  title: string;
  body: string;
}
export interface TourUI {
  skip: string;
  prev: string;
  next: string;
  done: string;
}

interface Spot {
  top: number;
  left: number;
  width: number;
  height: number;
  cx: number;
  bottom: number;
}

interface CardPos {
  top: number;
  left: number;
  arrow: number | null; // position x de la flèche (relative à la carte), null = pas de flèche
  placement: "top" | "bottom" | "center";
}

const PAD = 8; // marge du spotlight autour de la cible

export default function ProductTour({ storageKey, steps, ui }: { storageKey: string; steps: TourStep[]; ui: TourUI }) {
  const total = steps.length;

  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);
  const [spot, setSpot] = useState<Spot | null>(null);
  const [cardPos, setCardPos] = useState<CardPos | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const reduce = typeof window !== "undefined"
    && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    setMounted(true);
    try {
      if (!localStorage.getItem(storageKey)) setVisible(true);
    } catch { /* stockage indisponible — on n'affiche simplement pas le tuto */ }
  }, [storageKey]);

  const finish = useCallback(() => {
    try { localStorage.setItem(storageKey, "1"); } catch { /* ignore */ }
    setVisible(false);
  }, [storageKey]);

  // Mesure la cible de l'étape courante. Cible absente → spot null (carte
  // centrée). Recalculé au changement d'étape et au scroll/resize.
  const measure = useCallback(() => {
    const sel = steps[step]?.target;
    if (!sel) { setSpot(null); return; }
    const el = document.querySelector(sel);
    if (!el) { setSpot(null); return; }
    const r = el.getBoundingClientRect();
    setSpot({
      top: r.top - PAD,
      left: r.left - PAD,
      width: r.width + PAD * 2,
      height: r.height + PAD * 2,
      cx: r.left + r.width / 2,
      bottom: r.bottom + PAD,
    });
  }, [step, steps]);

  // Amène la cible à l'écran puis mesure (après stabilisation du scroll).
  useEffect(() => {
    if (!visible) return;
    const sel = steps[step]?.target;
    const el = sel ? document.querySelector(sel) : null;
    if (el) el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
    const id = setTimeout(measure, el && !reduce ? 320 : 0);
    return () => clearTimeout(id);
  }, [step, visible, measure, reduce, steps]);

  useEffect(() => {
    if (!visible) return;
    const on = () => measure();
    window.addEventListener("scroll", on, true);
    window.addEventListener("resize", on);
    return () => {
      window.removeEventListener("scroll", on, true);
      window.removeEventListener("resize", on);
    };
  }, [visible, measure]);

  // Positionne la carte + la flèche à partir du spotlight et de sa propre
  // taille mesurée. Choisit dessus/dessous selon la place disponible, puis
  // borne le tout dans le viewport.
  useLayoutEffect(() => {
    const card = cardRef.current;
    if (!card || !visible) return;
    const cw = card.offsetWidth;
    const ch = card.offsetHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    if (!spot) {
      setCardPos({ top: (vh - ch) / 2, left: (vw - cw) / 2, arrow: null, placement: "center" });
      return;
    }

    const spaceBelow = vh - spot.bottom;
    const placement: "top" | "bottom" = spaceBelow > ch + 24 ? "bottom" : "top";
    let top = placement === "bottom" ? spot.bottom + 14 : spot.top - ch - 14;
    let left = spot.cx - cw / 2;
    left = Math.max(12, Math.min(left, vw - cw - 12));
    top = Math.max(12, Math.min(top, vh - ch - 12));
    const arrow = Math.max(18, Math.min(spot.cx - left, cw - 18));
    setCardPos({ top, left, arrow, placement });
  }, [spot, step, visible]);

  useEffect(() => {
    if (!visible) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") finish();
      else if (e.key === "ArrowRight") setStep((s) => Math.min(total - 1, s + 1));
      else if (e.key === "ArrowLeft") setStep((s) => Math.max(0, s - 1));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible, total, finish]);

  if (!mounted || !visible || total === 0) return null;

  const s = steps[step];
  const isLast = step === total - 1;
  const arrowColor = "#f0ece6"; // même fond que la carte

  return createPortal(
    <div style={{ position: "fixed", inset: 0, zIndex: 9999 }} aria-live="polite" role="dialog" aria-modal="true">
      {/* Voile + capteur de clics (empêche d'interagir avec la page pendant le tuto) */}
      <div
        onClick={finish}
        style={{
          position: "absolute", inset: 0,
          background: spot ? "transparent" : "rgba(28,25,23,0.55)",
          cursor: "default",
          transition: reduce ? "none" : "background 0.2s ease",
        }}
      />

      {/* Spotlight : le box-shadow assombrit tout SAUF la découpe autour de la cible */}
      {spot && (
        <div
          style={{
            position: "absolute",
            top: spot.top, left: spot.left, width: spot.width, height: spot.height,
            borderRadius: 14,
            boxShadow: "0 0 0 9999px rgba(28,25,23,0.55), 0 0 0 2px rgba(201,169,110,0.9)",
            pointerEvents: "none",
            transition: reduce ? "none" : "all 0.28s cubic-bezier(0.4,0,0.2,1)",
          }}
        />
      )}

      {/* Carte d'explication */}
      <div
        ref={cardRef}
        style={{
          position: "absolute",
          top: cardPos?.top ?? -9999,
          left: cardPos?.left ?? -9999,
          width: "min(340px, calc(100vw - 24px))",
          background: "#f0ece6",
          border: "1px solid rgba(0,0,0,0.08)",
          borderRadius: 18,
          boxShadow: "0 24px 60px -20px rgba(28,25,23,0.45)",
          padding: "22px 22px 18px",
          opacity: cardPos ? 1 : 0,
          transition: reduce ? "none" : "top 0.28s cubic-bezier(0.4,0,0.2,1), left 0.28s cubic-bezier(0.4,0,0.2,1), opacity 0.2s ease",
        }}
      >
        {/* Flèche vers la cible */}
        {cardPos?.arrow != null && cardPos.placement !== "center" && (
          <div
            style={{
              position: "absolute",
              left: cardPos.arrow - 7,
              [cardPos.placement === "bottom" ? "top" : "bottom"]: -7,
              width: 14, height: 14,
              background: arrowColor,
              borderLeft: "1px solid rgba(0,0,0,0.08)",
              borderTop: "1px solid rgba(0,0,0,0.08)",
              transform: `rotate(${cardPos.placement === "bottom" ? 45 : 225}deg)`,
            }}
          />
        )}

        <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
          <span
            className="mono"
            style={{ fontSize: "0.68rem", letterSpacing: "0.14em", color: "#c9a96e", textTransform: "uppercase" }}
          >
            {step + 1} / {total}
          </span>
          <button
            onClick={finish}
            className="transition hover:opacity-70"
            style={{ fontSize: "0.75rem", color: "#a09a94", background: "none", border: "none", cursor: "pointer" }}
          >
            {ui.skip}
          </button>
        </div>

        <h3
          style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "1.15rem", fontWeight: 500, color: "#1c1917", marginBottom: 6, lineHeight: 1.25 }}
        >
          {s.title}
        </h3>
        <p style={{ fontSize: "0.875rem", lineHeight: 1.5, color: "#78716c" }}>{s.body}</p>

        <div className="flex items-center justify-between" style={{ marginTop: 18 }}>
          {/* Points de progression */}
          <div className="flex items-center gap-1.5">
            {steps.map((_, i) => (
              <span
                key={i}
                style={{
                  width: i === step ? 18 : 6, height: 6, borderRadius: 999,
                  background: i === step ? "#c9a96e" : "rgba(0,0,0,0.14)",
                  transition: reduce ? "none" : "all 0.2s ease",
                }}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {step > 0 && (
              <button
                onClick={() => setStep((v) => Math.max(0, v - 1))}
                className="transition hover:opacity-70"
                style={{ fontSize: "0.8rem", color: "#78716c", background: "none", border: "none", cursor: "pointer", padding: "8px 6px" }}
              >
                {ui.prev}
              </button>
            )}
            <button
              onClick={() => (isLast ? finish() : setStep((v) => Math.min(total - 1, v + 1)))}
              className="transition hover:opacity-85"
              style={{ fontSize: "0.8rem", fontWeight: 600, color: "white", background: "#1c1917", border: "none", cursor: "pointer", borderRadius: 999, padding: "9px 18px" }}
            >
              {isLast ? ui.done : ui.next}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
