"use client";

import { useEffect, useState } from "react";
import type { Locale } from "@/lib/i18n/types";

// Decorative hero composition: tilted profile card (cycles between 3 profile
// styles) + floating post-it notes. aria-hidden — purely visual, no semantic
// content. "use client" uniquement pour l'alternance automatique de la carte
// centrale ; le reste reste du décor statique.
const CARD_CYCLE_MS = 4500;
// Une URL par profil (dev/artiste/musicien) — cohérent avec les exemples réels
// (alex-martin, sophie-noir, solka) affichés plus bas sur la page.
const URL_NAMES = ["alex", "sophie", "solka"];

const STRINGS = {
  fr: { generating: "génération", yourUrl: "ton url", portfoliosCreated: "portfolios créés" },
  en: { generating: "generating", yourUrl: "your url", portfoliosCreated: "portfolios created" },
  es: { generating: "generación", yourUrl: "tu url", portfoliosCreated: "portfolios creados" },
  de: { generating: "Generierung", yourUrl: "deine URL", portfoliosCreated: "erstellte Portfolios" },
};

export default function HeroVisual({ locale, portfoliosCount }: { locale: Locale; portfoliosCount: number }) {
  const s = STRINGS[locale];
  const [cardIndex, setCardIndex] = useState(0);
  const [urlLen, setUrlLen] = useState(URL_NAMES[0].length);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    if (reduced) return;
    const t = setInterval(() => setCardIndex((i) => (i + 1) % 3), CARD_CYCLE_MS);
    return () => clearInterval(t);
  }, [reduced]);

  // L'URL se retape lettre par lettre à chaque changement de carte, comme si
  // elle venait d'être générée — renforce l'idée de génération en direct.
  useEffect(() => {
    if (reduced) { setUrlLen(URL_NAMES[cardIndex].length); return; }
    setUrlLen(0);
    let i = 0;
    const t = setInterval(() => {
      i++;
      setUrlLen(i);
      if (i >= URL_NAMES[cardIndex].length) clearInterval(t);
    }, 90);
    return () => clearInterval(t);
  }, [cardIndex, reduced]);

  return (
    <div
      aria-hidden="true"
      style={{
        position: "relative",
        width: 340,
        height: 460,
        flexShrink: 0,
      }}
    >
      {/* Dot-grid workspace texture */}
      <div style={{
        position: "absolute",
        inset: -40,
        backgroundImage: "radial-gradient(rgba(28,25,23,0.055) 1px, transparent 1px)",
        backgroundSize: "22px 22px",
        borderRadius: 20,
        pointerEvents: "none",
        zIndex: 0,
      }} />

      {/* ── Carte centrale — alterne entre 3 styles de profil ─────────── */}
      <div style={{ position: "absolute", inset: "18px 22px", zIndex: 5 }}>
        <div style={{ position: "absolute", inset: 0, opacity: cardIndex === 0 ? 1 : 0, transition: "opacity 0.6s ease" }}><DevCard /></div>
        <div style={{ position: "absolute", inset: 0, opacity: cardIndex === 1 ? 1 : 0, transition: "opacity 0.6s ease" }}><ArtistCard /></div>
        <div style={{ position: "absolute", inset: 0, opacity: cardIndex === 2 ? 1 : 0, transition: "opacity 0.6s ease" }}><MusicianCard /></div>
      </div>

      {/* Barre de "génération" en cours — se remplit sur la durée d'un cycle,
          key={cardIndex} force le remount du noeud donc redémarre l'animation
          CSS proprement à chaque nouvelle carte. */}
      <div style={{ position: "absolute", top: 18, left: 22, right: 22, height: 3, zIndex: 6, background: "rgba(0,0,0,0.08)", borderRadius: "12px 12px 0 0", overflow: "hidden" }}>
        {!reduced && <div key={cardIndex} className="ld-progress-fill" style={{ height: "100%", background: "#c9a96e" }} />}
      </div>

      {/* ── Post-it 1 : "< 60s" — top right ───── */}
      <div className="ld-float" style={{
        position: "absolute", top: -6, right: -6, zIndex: 14,
        background: "#fffdf0",
        borderTop: "3px solid #f0d98a",
        borderRadius: "2px 6px 6px 2px",
        padding: "13px 15px 11px",
        transform: "rotate(5.5deg)",
        boxShadow: "2px 5px 18px rgba(0,0,0,0.10), 0 1px 3px rgba(0,0,0,0.06)",
        minWidth: 82,
        animationDelay: "0.2s",
        ["--ld-rot" as string]: "5.5deg",
      }}>
        <p style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: "1.5rem", fontWeight: 500,
          color: "#1c1917", lineHeight: 1, marginBottom: 5,
        }}>{"<60s"}</p>
        <p style={{ fontSize: "0.575rem", color: "#a09a94", fontFamily: "'JetBrains Mono', monospace" }}>{s.generating}</p>
      </div>

      {/* ── Post-it 2 : terminal badge — top left ─ */}
      <div className="ld-float" style={{
        position: "absolute", top: 28, left: 0, zIndex: 14,
        background: "#111318",
        borderRadius: 6,
        padding: "7px 11px",
        transform: "rotate(-3.5deg)",
        boxShadow: "2px 4px 14px rgba(0,0,0,0.22)",
        animationDelay: "1.1s",
        ["--ld-rot" as string]: "-3.5deg",
      }}>
        <p style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: "0.575rem", color: "rgba(255,255,255,0.72)",
          whiteSpace: "nowrap", letterSpacing: "0.04em",
        }}>
          <span style={{ color: "#c9a96e" }}>✓</span> deploy → production
        </p>
      </div>

      {/* ── Post-it 3 : URL — left middle ───────── */}
      <div className="ld-float" style={{
        position: "absolute", top: "44%", left: -8, zIndex: 13,
        background: "white",
        borderTop: "3px solid #e2ddd8",
        borderRadius: "2px 6px 6px 2px",
        padding: "9px 13px 9px",
        transform: "rotate(-4.5deg)",
        boxShadow: "2px 4px 14px rgba(0,0,0,0.09), 0 1px 2px rgba(0,0,0,0.04)",
        animationDelay: "2.3s",
        ["--ld-rot" as string]: "-4.5deg",
      }}>
        <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.5rem", color: "#c8c4bf", marginBottom: 3, letterSpacing: "0.03em" }}>
          {s.yourUrl}
        </p>
        <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.6875rem", color: "#1c1917", whiteSpace: "nowrap" }}>
          folyo.page/<span style={{ color: "#c9a96e" }}>{URL_NAMES[cardIndex].slice(0, urlLen)}</span>
          {!reduced && urlLen < URL_NAMES[cardIndex].length && <span className="cursor-blink" style={{ color: "#c9a96e" }}>▍</span>}
        </p>
      </div>

      {/* ── Post-it 4 : "1 247" — bottom left ──── */}
      <div className="ld-float" style={{
        position: "absolute", bottom: 20, left: -4, zIndex: 14,
        background: "#f0ece6",
        borderTop: "3px solid #d4cec8",
        borderRadius: "2px 6px 6px 2px",
        padding: "12px 15px 11px",
        transform: "rotate(-5.5deg)",
        boxShadow: "2px 5px 16px rgba(0,0,0,0.09)",
        animationDelay: "3.4s",
        ["--ld-rot" as string]: "-5.5deg",
      }}>
        <p style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: "1.375rem", fontWeight: 500,
          color: "#1c1917", lineHeight: 1, marginBottom: 4,
        }}>{portfoliosCount.toLocaleString("fr-FR")}</p>
        <p style={{ fontSize: "0.575rem", color: "#a09a94" }}>{s.portfoliosCreated}</p>
      </div>

    </div>
  );
}

// ── Carte 1 : profil développeur (CV classique) ────────────────────────────
function DevCard() {
  return (
    <div style={{
      position: "absolute", inset: 0,
      background: "white", borderRadius: 12,
      transform: "rotate(-4deg) translateY(4px)",
      boxShadow: "0 6px 24px rgba(0,0,0,0.06), 0 24px 64px rgba(0,0,0,0.07)",
      padding: "22px 20px 28px", overflow: "hidden",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 16 }}>
        <div style={{
          width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
          background: "linear-gradient(135deg, #ede9e4 0%, #ddd8d2 100%)",
          border: "1.5px solid rgba(201,169,110,0.22)",
        }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ height: 9, width: 108, background: "#1c1917", borderRadius: 3, marginBottom: 6 }} />
          <div style={{ height: 6, width: 136, background: "#c9a96e", borderRadius: 3, opacity: 0.55 }} />
        </div>
      </div>
      <div style={{ display: "flex", gap: 7, marginBottom: 16, paddingBottom: 14, borderBottom: "1px solid #f0ece6" }}>
        {[68, 82, 72].map((w, i) => <div key={i} style={{ height: 5, width: w, background: "#ede9e4", borderRadius: 3 }} />)}
      </div>
      <div style={{ marginBottom: 14 }}>
        <div style={{ height: 6, width: 78, background: "#1c1917", borderRadius: 2, marginBottom: 9, opacity: 0.82 }} />
        <div style={{ marginBottom: 9 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <div style={{ height: 6, width: 86, background: "#1c1917", borderRadius: 2, opacity: 0.68 }} />
            <div style={{ height: 5, width: 48, background: "#ede9e4", borderRadius: 2 }} />
          </div>
          <div style={{ height: 5, width: 104, background: "#c9a96e", borderRadius: 2, opacity: 0.42, marginBottom: 5 }} />
          {[148, 128, 108].map((w, i) => <div key={i} style={{ height: 4, width: w, background: "#f0ece6", borderRadius: 2, marginBottom: 3 }} />)}
        </div>
      </div>
      <div style={{ marginBottom: 14, paddingTop: 12, borderTop: "1px solid #f0ece6" }}>
        <div style={{ height: 6, width: 94, background: "#1c1917", borderRadius: 2, marginBottom: 9, opacity: 0.82 }} />
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
          {["React", "TypeScript", "Node.js", "Python", "SQL", "Docker"].map((tag) => (
            <span key={tag} style={{ fontSize: "0.5rem", padding: "2.5px 7px", borderRadius: 100, background: "rgba(201,169,110,0.1)", color: "#c9a96e", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.02em", lineHeight: 1.6 }}>{tag}</span>
          ))}
        </div>
      </div>
      <div style={{ paddingTop: 12, borderTop: "1px solid #f0ece6" }}>
        <div style={{ height: 6, width: 58, background: "#1c1917", borderRadius: 2, marginBottom: 9, opacity: 0.82 }} />
        {[148, 126, 104].map((w, i) => <div key={i} style={{ height: 4, width: w, background: "#f0ece6", borderRadius: 2, marginBottom: 4 }} />)}
      </div>
      <FolyoStamp light={false} />
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 52, background: "linear-gradient(to bottom, transparent, white)", pointerEvents: "none" }} />
    </div>
  );
}

// ── Carte 2 : profil artiste (galerie sombre) ──────────────────────────────
function ArtistCard() {
  const swatches = ["#1c1c2e", "#c9b99a", "#2d4a3e", "#e8c97a", "#4a2d3e", "#8b6b4a"];
  return (
    <div style={{
      position: "absolute", inset: 0,
      background: "#f5f3ef", borderRadius: 12,
      transform: "rotate(3deg) translateY(2px)",
      boxShadow: "0 6px 24px rgba(0,0,0,0.06), 0 24px 64px rgba(0,0,0,0.07)",
      padding: "22px 20px 28px", overflow: "hidden",
    }}>
      <div style={{ height: 6, width: 74, background: "#a09a94", borderRadius: 2, opacity: 0.6, marginBottom: 4, fontFamily: "'JetBrains Mono', monospace" }} />
      <div style={{ height: 14, width: 168, background: "#44403c", borderRadius: 2, marginBottom: 18, fontFamily: "'Playfair Display', Georgia, serif" }} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 5, marginBottom: 16 }}>
        {swatches.map((c, i) => <div key={i} style={{ background: c, borderRadius: 3, paddingBottom: `${70 + (i % 3) * 20}%` }} />)}
      </div>
      <div style={{ paddingTop: 12, borderTop: "1px solid rgba(0,0,0,0.06)" }}>
        {[150, 128, 96].map((w, i) => <div key={i} style={{ height: 4, width: w, background: "rgba(0,0,0,0.08)", borderRadius: 2, marginBottom: 5 }} />)}
      </div>
      <FolyoStamp light={false} />
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 52, background: "linear-gradient(to bottom, transparent, #f5f3ef)", pointerEvents: "none" }} />
    </div>
  );
}

// ── Carte 3 : profil musicien (dark neon) ──────────────────────────────────
function MusicianCard() {
  return (
    <div style={{
      position: "absolute", inset: 0,
      background: "#0a0a0f", borderRadius: 12,
      transform: "rotate(-3deg) translateY(3px)",
      boxShadow: "0 6px 24px rgba(0,0,0,0.10), 0 24px 64px rgba(0,0,0,0.12)",
      padding: "22px 20px 28px", overflow: "hidden",
    }}>
      <div style={{ height: 6, width: 58, background: "rgba(232,121,249,0.55)", borderRadius: 2, marginBottom: 8 }} />
      <div style={{ height: 16, width: 140, background: "rgba(255,255,255,0.92)", borderRadius: 2, marginBottom: 18 }} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6, marginBottom: 16 }}>
        {["1,3k", "14", "8,4k"].map((v, i) => (
          <div key={i} style={{ borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", padding: "10px 6px", textAlign: "center" }}>
            <p style={{ fontSize: "0.8rem", fontWeight: 700, color: "#e879f9", margin: 0 }}>{v}</p>
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 6 }}>
        {[0, 1].map((i) => (
          <div key={i} style={{ borderRadius: 8, background: "linear-gradient(135deg, rgba(232,121,249,0.18), rgba(10,10,15,0))", height: 40 }} />
        ))}
      </div>
      <FolyoStamp light />
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 52, background: "linear-gradient(to bottom, transparent, #0a0a0f)", pointerEvents: "none" }} />
    </div>
  );
}

function FolyoStamp({ light }: { light: boolean }) {
  const color = light ? "rgba(255,255,255,0.35)" : "#c9a96e";
  return (
    <div style={{ position: "absolute", bottom: 12, right: 14, transform: "rotate(-2deg)", display: "flex", alignItems: "center", gap: 4, opacity: light ? 1 : 0.3, zIndex: 2 }}>
      <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
        <circle cx="4.5" cy="4.5" r="3.8" stroke={color} strokeWidth="1.2" />
        <path d="M2.8 4.5l1.2 1.2 2.2-2.2" stroke={color} strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span style={{ fontSize: "0.5rem", color, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.06em" }}>
        folyo
      </span>
    </div>
  );
}
