"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { ValidatedPortfolioJSON } from "@/lib/anthropic/schema";
import { THEME_PRESETS } from "@/lib/portfolio/themes";

type VSection = ValidatedPortfolioJSON["sections"][number];
type VMeta    = ValidatedPortfolioJSON["meta"];
type VTheme   = ValidatedPortfolioJSON["theme"];

interface Props {
  initialData: ValidatedPortfolioJSON;
  portfolioId: string;
  slug: string;
  profileType: string;
}

// ── Main ──────────────────────────────────────────────────────────────────────
const MAX_HISTORY = 50;

export default function VisualEditor({ initialData, portfolioId, slug, profileType }: Props) {
  const router = useRouter();
  const [data, setData]               = useState<ValidatedPortfolioJSON>(initialData);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [saveStatus, setSaveStatus]   = useState<"idle"|"saving"|"saved"|"error">("idle");
  const [canUndo, setCanUndo]         = useState(false);
  const historyRef = useRef<ValidatedPortfolioJSON[]>([]);

  // Push current state to history before any mutation
  const snapshot = (current: ValidatedPortfolioJSON) => {
    historyRef.current = [...historyRef.current.slice(-MAX_HISTORY + 1), current];
    setCanUndo(true);
  };

  const undo = () => {
    const prev = historyRef.current.pop();
    if (!prev) return;
    setData(prev);
    setSaveStatus("idle");
    setCanUndo(historyRef.current.length > 0);
  };

  // Ctrl+Z / Cmd+Z global shortcut
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const updateMeta = (u: Partial<VMeta>) => {
    setData(d => { snapshot(d); return { ...d, meta: { ...d.meta, ...u } }; });
    setSaveStatus("idle");
  };
  const updateTheme = (u: Partial<VTheme>) => {
    setData(d => { snapshot(d); return { ...d, theme: { ...d.theme, ...u } }; });
    setSaveStatus("idle");
  };
  const updateSection = (idx: number, updated: VSection) => {
    setData(d => { snapshot(d); const s = [...d.sections]; s[idx] = updated; return { ...d, sections: s }; });
    setSaveStatus("idle");
  };
  const moveSection = (idx: number, dir: -1 | 1) => {
    const ni = idx + dir;
    if (ni < 0 || ni >= data.sections.length) return;
    setData(d => {
      snapshot(d);
      const s = [...d.sections];
      [s[idx], s[ni]] = [s[ni], s[idx]];
      return { ...d, sections: s };
    });
    setSelectedIdx(ni);
  };
  const removeSection = (idx: number) => {
    setData(d => { snapshot(d); return { ...d, sections: d.sections.filter((_, i) => i !== idx) }; });
    setSelectedIdx(null);
    setSaveStatus("idle");
  };

  const save = async () => {
    setSaveStatus("saving");
    try {
      const res = await fetch(`/api/portfolio/${portfolioId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteJson: data }),
      });
      setSaveStatus(res.ok ? "saved" : "error");
    } catch { setSaveStatus("error"); }
  };

  const btnBg    = saveStatus === "saved" ? "#16a34a" : saveStatus === "error" ? "#dc2626" : "#c9a96e";
  const btnLabel = saveStatus === "saving" ? "…" : saveStatus === "saved" ? "✓ Sauvegardé" : saveStatus === "error" ? "Erreur !" : "Enregistrer";

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", fontFamily: "system-ui,sans-serif" }}>

      {/* LEFT: live preview */}
      <div style={{ flex: 1, overflowY: "auto", minWidth: 0 }}>

        {/* Toolbar */}
        <div style={{ position: "sticky", top: 0, zIndex: 100, background: "#1c1917", height: 52, display: "flex", alignItems: "center", padding: "0 1.25rem", gap: "0.75rem" }}>
          <button onClick={() => router.push(`/portfolio/${portfolioId}`)}
            style={{ color: "#c9a96e", background: "none", border: "none", cursor: "pointer", fontSize: "0.875rem", whiteSpace: "nowrap" }}>
            ← Retour
          </button>
          <span style={{ flex: 1, fontSize: "0.725rem", color: "#6b7280" }}>
            Clique une section pour l'éditer · ↑↓ pour réordonner
          </span>
          <button onClick={undo} disabled={!canUndo} title="Annuler (Ctrl+Z)"
            style={{ background: canUndo ? "rgba(255,255,255,0.08)" : "transparent", color: canUndo ? "#c8c4bf" : "#3f3f3f", border: "1px solid rgba(255,255,255,0.1)", padding: "0.35rem 0.75rem", borderRadius: "0.5rem", cursor: canUndo ? "pointer" : "default", fontSize: "0.75rem", whiteSpace: "nowrap", transition: "all 0.15s" }}>
            ↩ Annuler
          </button>
          <a href={`/preview/${slug}`} target="_blank" rel="noopener noreferrer"
            style={{ fontSize: "0.75rem", color: "#9ca3af", border: "1px solid rgba(255,255,255,0.12)", padding: "0.35rem 0.75rem", borderRadius: "0.5rem", textDecoration: "none", whiteSpace: "nowrap" }}>
            Aperçu ↗
          </a>
          <button onClick={save} disabled={saveStatus === "saving"}
            style={{ background: btnBg, color: "#1c1917", border: "none", padding: "0.45rem 1.1rem", borderRadius: "0.6rem", fontSize: "0.8125rem", fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
            {btnLabel}
          </button>
        </div>

        {/* Portfolio preview */}
        <PortfolioPreview
          data={data}
          selectedIdx={selectedIdx}
          onSelect={(i) => setSelectedIdx(i === selectedIdx ? null : i)}
          onMove={moveSection}
          onRemove={removeSection}
        />
      </div>

      {/* RIGHT: editor panel */}
      <div style={{ width: 320, flexShrink: 0, borderLeft: "1px solid rgba(0,0,0,0.08)", background: "#fafaf9", overflowY: "auto" }}>
        {selectedIdx === null ? (
          <ThemeEditor meta={data.meta} theme={data.theme} updateMeta={updateMeta} updateTheme={updateTheme} profileType={profileType} portfolioId={portfolioId} />
        ) : (
          <SectionEditor
            section={data.sections[selectedIdx]}
            idx={selectedIdx}
            updateSection={updateSection}
            removeSection={removeSection}
            onClose={() => setSelectedIdx(null)}
            meta={data.meta}
            updateMeta={updateMeta}
          />
        )}
      </div>

    </div>
  );
}

// ── Background pattern overlay ────────────────────────────────────────────────
function BackgroundPattern({ pattern, color }: { pattern: string; color: string }) {
  if (!pattern || pattern === "none") return null;

  // Deterministic pseudo-random values seeded by index
  const seed = (i: number, offset = 0) => Math.abs(Math.sin(i * 127.1 + offset * 311.7));

  if (pattern === "lines") {
    const lines = Array.from({ length: 28 }, (_, i) => ({
      x1: seed(i, 0) * 100,
      y1: seed(i, 1) * 100,
      x2: seed(i, 0) * 100 + (seed(i, 2) - 0.5) * 40,
      y2: seed(i, 1) * 100 + (seed(i, 3) - 0.5) * 60,
      opacity: 0.06 + seed(i, 4) * 0.1,
      width: 0.3 + seed(i, 5) * 0.5,
    }));
    return (
      <svg viewBox="0 0 100 100" preserveAspectRatio="none"
        style={{ position: "fixed", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 0 }}>
        {lines.map((l, i) => (
          <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
            stroke={color} strokeWidth={l.width} opacity={l.opacity} />
        ))}
      </svg>
    );
  }

  if (pattern === "dots") {
    const dots = Array.from({ length: 80 }, (_, i) => ({
      cx: seed(i, 0) * 100, cy: seed(i, 1) * 100,
      r: 0.15 + seed(i, 2) * 0.3, opacity: 0.05 + seed(i, 3) * 0.12,
    }));
    return (
      <svg viewBox="0 0 100 100" preserveAspectRatio="none"
        style={{ position: "fixed", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 0 }}>
        {dots.map((d, i) => (
          <circle key={i} cx={d.cx} cy={d.cy} r={d.r} fill={color} opacity={d.opacity} />
        ))}
      </svg>
    );
  }

  if (pattern === "grid") {
    const steps = Array.from({ length: 11 }, (_, i) => i * 10);
    return (
      <svg viewBox="0 0 100 100" preserveAspectRatio="none"
        style={{ position: "fixed", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 0 }}>
        {steps.map((v) => <>
          <line key={`h${v}`} x1={0} y1={v} x2={100} y2={v} stroke={color} strokeWidth={0.15} opacity={0.08} />
          <line key={`v${v}`} x1={v} y1={0} x2={v} y2={100} stroke={color} strokeWidth={0.15} opacity={0.08} />
        </>)}
      </svg>
    );
  }

  if (pattern === "crosshatch") {
    const n = 15;
    return (
      <svg viewBox="0 0 100 100" preserveAspectRatio="none"
        style={{ position: "fixed", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 0 }}>
        {Array.from({ length: n }, (_, i) => {
          const v = (i / n) * 140 - 20;
          return <>
            <line key={`d1${i}`} x1={v} y1={0} x2={v + 60} y2={100} stroke={color} strokeWidth={0.3} opacity={0.07} />
            <line key={`d2${i}`} x1={v} y1={100} x2={v + 60} y2={0} stroke={color} strokeWidth={0.3} opacity={0.07} />
          </>;
        })}
      </svg>
    );
  }

  return null;
}

// ── Portfolio preview (left pane) ─────────────────────────────────────────────
function PortfolioPreview({ data, selectedIdx, onSelect, onMove, onRemove }: {
  data: ValidatedPortfolioJSON;
  selectedIdx: number | null;
  onSelect: (i: number) => void;
  onMove: (i: number, dir: -1 | 1) => void;
  onRemove: (i: number) => void;
}) {
  const { meta, theme, sections } = data;
  const { background_color: bg, text_color: txt, primary_color: pri, accent_color: acc, font_heading, font_body } = theme;
  const hFont = `'${font_heading}', Georgia, serif`;
  const bFont = `'${font_body}', system-ui, sans-serif`;

  return (
    <div style={{ fontFamily: bFont, background: bg, color: txt, minHeight: "100vh", position: "relative" }}>
      <BackgroundPattern pattern={theme.background_pattern ?? "none"} color={txt} />
      <nav style={{ position: "sticky", top: 52, zIndex: 40, borderBottom: `1px solid ${txt}10`, background: `${bg}e8`, backdropFilter: "blur(12px)" }}>
        <div style={{ maxWidth: 960, margin: "0 auto", padding: "0.875rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontWeight: 700, color: pri, fontFamily: hFont, fontSize: "1rem" }}>{meta.name}</span>
          <div style={{ display: "flex", gap: "1.25rem", fontSize: "0.8125rem", color: `${txt}70` }}>
            <span>À propos</span><span>Projets</span><span>Contact</span>
          </div>
        </div>
      </nav>

      {sections.map((section, i) => (
        <SectionWrapper key={`${section.type}-${i}`}
          selected={selectedIdx === i}
          onClick={() => onSelect(i)}
          onMoveUp={i > 0 ? () => onMove(i, -1) : undefined}
          onMoveDown={i < sections.length - 1 ? () => onMove(i, 1) : undefined}
          onRemove={section.type !== "hero" ? () => onRemove(i) : undefined}
          pri={pri}>
          <SectionRender section={section} meta={meta} theme={theme} bg={bg} txt={txt} pri={pri} acc={acc} hFont={hFont} />
        </SectionWrapper>
      ))}

      <footer style={{ padding: "2rem", textAlign: "center", fontSize: "0.75rem", color: `${txt}30`, background: bg }}>
        Créé avec <span style={{ color: pri }}>Folyyo</span>
      </footer>
    </div>
  );
}

// ── Section wrapper (hover + click + move) ────────────────────────────────────
function SectionWrapper({ children, selected, onClick, onMoveUp, onMoveDown, onRemove, pri }: {
  children: React.ReactNode;
  selected: boolean;
  onClick: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onRemove?: () => void;
  pri: string;
}) {
  const [hovered, setHovered] = useState(false);
  const show = hovered || selected;

  return (
    <div style={{ position: "relative", cursor: "pointer", outline: selected ? `2px solid ${pri}` : hovered ? `2px dashed ${pri}55` : "none", outlineOffset: -2 }}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}>
      {show && (
        <div style={{ position: "absolute", top: 10, right: 10, zIndex: 20, display: "flex", gap: 4 }}
          onClick={(e) => e.stopPropagation()}>
          {onMoveUp && (
            <button onClick={onMoveUp} title="Monter"
              style={{ background: pri, color: "#fff", border: "none", borderRadius: 6, width: 28, height: 28, cursor: "pointer", fontSize: 13 }}>↑</button>
          )}
          {onMoveDown && (
            <button onClick={onMoveDown} title="Descendre"
              style={{ background: pri, color: "#fff", border: "none", borderRadius: 6, width: 28, height: 28, cursor: "pointer", fontSize: 13 }}>↓</button>
          )}
          <span style={{ background: pri, color: "#1c1917", borderRadius: 6, padding: "0 8px", height: 28, display: "flex", alignItems: "center", fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" }}>
            Éditer →
          </span>
          {onRemove && (
            <button onClick={onRemove} title="Supprimer"
              style={{ background: "#dc2626", color: "#fff", border: "none", borderRadius: 6, width: 28, height: 28, cursor: "pointer", fontSize: 14, fontWeight: 700, lineHeight: 1 }}>✕</button>
          )}
        </div>
      )}
      {children}
    </div>
  );
}

// ── Section render ─────────────────────────────────────────────────────────────
function SectionRender({ section, meta, theme, bg, txt, pri, acc, hFont }: {
  section: VSection; meta: VMeta; theme: VTheme;
  bg: string; txt: string; pri: string; acc: string; hFont: string;
}) {
  switch (section.type) {
    case "hero": {
      const heroImg = theme.hero_image_url;
      const overlay = theme.overlay_opacity ?? 0.8;
      return (
        <section style={{ position: "relative", minHeight: "90vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "6rem 1.5rem 3rem", textAlign: "center", backgroundImage: heroImg ? `url(${heroImg})` : undefined, backgroundSize: "cover", backgroundPosition: "center" }}>
          {heroImg && <div style={{ position: "absolute", inset: 0, background: bg, opacity: overlay }} />}
          <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
            {meta.avatar_url && <img src={meta.avatar_url} alt={meta.name} width={88} height={88} style={{ borderRadius: "50%", marginBottom: "1.5rem", border: `2px solid ${pri}`, objectFit: "cover" }} />}
            <h1 style={{ fontSize: "clamp(2rem,5vw,3.5rem)", fontWeight: 700, fontFamily: hFont, color: txt, marginBottom: "0.75rem", lineHeight: 1.1 }}>{section.title || meta.name}</h1>
            <p style={{ fontSize: "1.0625rem", fontWeight: 500, color: pri, marginBottom: "0.5rem" }}>{meta.title}</p>
            <p style={{ fontSize: "1rem", color: `${txt}70`, maxWidth: 520, marginBottom: "2.5rem", lineHeight: 1.6 }}>{section.subtitle || meta.tagline}</p>
            <div style={{ display: "flex", gap: "0.875rem", flexWrap: "wrap", justifyContent: "center" }}>
              <span style={{ background: pri, color: "#fff", padding: "0.75rem 1.75rem", borderRadius: "0.75rem", fontWeight: 600, fontSize: "0.875rem" }}>{section.cta_text}</span>
              {meta.github_url && <span style={{ border: `1px solid ${txt}20`, color: `${txt}80`, padding: "0.75rem 1.75rem", borderRadius: "0.75rem", fontSize: "0.875rem" }}>GitHub →</span>}
            </div>
          </div>
        </section>
      );
    }

    case "about": return (
      <section style={{ padding: "5rem 1.5rem", background: `${bg}f0` }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <h2 style={{ fontFamily: hFont, fontSize: "1.75rem", fontWeight: 700, color: txt, marginBottom: "1.25rem" }}>À propos</h2>
          <p style={{ fontSize: "1.0rem", lineHeight: 1.75, color: `${txt}cc` }}>{section.content}</p>
          {section.highlight && <p style={{ marginTop: "1rem", borderLeft: `3px solid ${pri}`, paddingLeft: "1rem", color: pri, fontStyle: "italic" }}>{section.highlight}</p>}
        </div>
      </section>
    );

    case "skills": return (
      <section style={{ padding: "5rem 1.5rem", background: bg }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <h2 style={{ fontFamily: hFont, fontSize: "1.75rem", fontWeight: 700, color: txt, marginBottom: "2rem" }}>Compétences</h2>
          <div style={{ display: "grid", gap: "0.625rem", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))" }}>
            {section.items.map((s) => (
              <div key={s.name} style={{ border: `1px solid ${txt}12`, borderRadius: "0.75rem", padding: "0.875rem", background: `${txt}04` }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.375rem" }}>
                  <span style={{ fontWeight: 600, fontSize: "0.8125rem", color: txt }}>{s.name}</span>
                  <span style={{ fontSize: "0.7rem", color: pri }}>{s.level}/5</span>
                </div>
                <div style={{ height: 3, borderRadius: 2, background: `${txt}15` }}>
                  <div style={{ height: "100%", width: `${(s.level / 5) * 100}%`, background: pri, borderRadius: 2 }} />
                </div>
                <span style={{ fontSize: "0.7rem", color: `${txt}50`, marginTop: "0.25rem", display: "block" }}>{s.category}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    );

    case "projects": return (
      <section style={{ padding: "5rem 1.5rem", background: `${bg}f0` }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <h2 style={{ fontFamily: hFont, fontSize: "1.75rem", fontWeight: 700, color: txt, marginBottom: "2rem" }}>Projets</h2>
          <div style={{ display: "grid", gap: "1.25rem", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
            {section.items.map((p) => (
              <div key={p.name} style={{ border: `1px solid ${txt}12`, borderRadius: "1rem", padding: "1.25rem", background: `${txt}03` }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.625rem" }}>
                  <h3 style={{ fontWeight: 600, color: txt, fontSize: "0.9375rem" }}>{p.name}</h3>
                  {p.stars ? <span style={{ fontSize: "0.7rem", color: pri }}>★ {p.stars}</span> : null}
                </div>
                <p style={{ fontSize: "0.8125rem", color: `${txt}80`, marginBottom: "0.875rem", lineHeight: 1.6 }}>{p.description}</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem" }}>
                  {p.tech_stack.map((t) => <span key={t} style={{ fontSize: "0.7rem", padding: "0.2rem 0.5rem", borderRadius: "0.3rem", background: `${pri}18`, color: pri }}>{t}</span>)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );

    case "experience": return (
      <section style={{ padding: "5rem 1.5rem", background: bg }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <h2 style={{ fontFamily: hFont, fontSize: "1.75rem", fontWeight: 700, color: txt, marginBottom: "2rem" }}>Expérience</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
            {section.items.map((exp) => (
              <div key={exp.company} style={{ borderLeft: `2px solid ${pri}30`, paddingLeft: "1.25rem", position: "relative" }}>
                <div style={{ position: "absolute", left: -5, top: 4, width: 8, height: 8, borderRadius: "50%", background: pri }} />
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.2rem" }}>
                  <span style={{ fontWeight: 600, color: txt, fontSize: "0.9375rem" }}>{exp.role}</span>
                  <span style={{ color: pri, fontWeight: 500, fontSize: "0.9375rem" }}>{exp.company}</span>
                </div>
                <p style={{ fontSize: "0.75rem", color: `${txt}40`, marginBottom: "0.4rem" }}>{exp.period}</p>
                <p style={{ fontSize: "0.8125rem", color: `${txt}80`, lineHeight: 1.6 }}>{exp.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    );

    case "contact": return (
      <section style={{ padding: "5rem 1.5rem", textAlign: "center", background: `${bg}f0` }}>
        <div style={{ maxWidth: 480, margin: "0 auto" }}>
          <h2 style={{ fontFamily: hFont, fontSize: "1.75rem", fontWeight: 700, color: txt, marginBottom: "1rem" }}>Contact</h2>
          <p style={{ color: `${txt}80`, marginBottom: "1.75rem", lineHeight: 1.6 }}>{section.message}</p>
          <div style={{ display: "inline-block", background: pri, color: "#fff", padding: "0.875rem 2rem", borderRadius: "0.75rem", fontWeight: 600, marginBottom: "1.75rem" }}>{section.email}</div>
          <div style={{ display: "flex", justifyContent: "center", gap: "1.5rem" }}>
            {section.links.map((l) => <span key={l.label} style={{ fontSize: "0.875rem", color: `${txt}60` }}>{l.label}</span>)}
          </div>
        </div>
      </section>
    );

    default: return null;
  }
}

// Resize + compress image to max 400px, returns JPEG data URL (~15-40 KB)
function resizeImage(file: File, maxPx = 400, quality = 0.85): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(maxPx / img.width, maxPx / img.height, 1);
        const canvas = document.createElement("canvas");
        canvas.width  = Math.round(img.width  * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

// ── Theme editor (right panel — no section selected) ──────────────────────────
function ThemeEditor({ meta, theme, updateMeta, updateTheme, profileType, portfolioId }: {
  meta: VMeta; theme: VTheme;
  updateMeta: (u: Partial<VMeta>) => void;
  updateTheme: (u: Partial<VTheme>) => void;
  profileType: string;
  portfolioId: string;
}) {
  const [aiStatus, setAiStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [aiReason, setAiReason] = useState("");

  const filteredPresets = THEME_PRESETS.filter((p) => p.profile_types.includes(profileType));

  async function generateAiTheme() {
    setAiStatus("loading");
    setAiReason("");
    try {
      const res = await fetch(`/api/portfolio/${portfolioId}/generate-theme`, { method: "POST" });
      if (!res.ok) throw new Error("Erreur serveur");
      const { theme: newTheme, reasoning } = await res.json();
      updateTheme(newTheme);
      setAiReason(reasoning);
      setAiStatus("done");
    } catch {
      setAiStatus("error");
    }
  }

  return (
    <div style={{ padding: "1.25rem" }}>
      <h2 style={{ fontSize: "0.8125rem", fontWeight: 600, color: "#1c1917", marginBottom: "0.25rem" }}>Thème & identité</h2>
      <p style={{ fontSize: "0.725rem", color: "#a09a94", marginBottom: "1.25rem" }}>Clique une section à gauche pour l'éditer.</p>

      <PanelSection title="Changer de thème">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>

          {/* ── Génération IA ── */}
          <button
            onClick={generateAiTheme}
            disabled={aiStatus === "loading"}
            style={{
              gridColumn: "1 / -1",
              border: theme.theme_preset_id === "ai-generated" ? "2px solid #c9a96e" : "1px solid rgba(201,169,110,0.4)",
              borderRadius: "0.5rem",
              overflow: "hidden",
              cursor: aiStatus === "loading" ? "wait" : "pointer",
              background: "none",
              padding: 0,
              textAlign: "left",
              opacity: aiStatus === "loading" ? 0.7 : 1,
            }}>
            <div style={{ height: 44, background: "linear-gradient(135deg, #1c1917, #3b1f0a, #1c1917)", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
              {aiStatus === "loading" ? (
                <span style={{ fontSize: "0.75rem", color: "#c9a96e" }}>Analyse en cours…</span>
              ) : (
                <>
                  <span style={{ fontSize: "0.9rem" }}>✦</span>
                  <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#c9a96e" }}>Génération IA</span>
                </>
              )}
            </div>
            <div style={{ padding: "0.3rem 0.5rem", background: "white" }}>
              <p style={{ fontSize: "0.675rem", color: "#78716c", margin: 0 }}>
                {aiStatus === "done" && aiReason ? aiReason : "L'IA analyse ton portfolio et crée le thème idéal"}
              </p>
            </div>
          </button>

          {/* ── Presets filtrés par profil ── */}
          {filteredPresets.map((preset) => (
            <button key={preset.id}
              onClick={() => updateTheme({
                primary_color:    preset.primary_color,
                background_color: preset.background_color,
                text_color:       preset.text_color,
                accent_color:     preset.accent_color,
                font_heading:     preset.font_heading,
                font_body:        preset.font_body,
                style:            preset.style,
                hero_image_url:   preset.hero_image_url ?? undefined,
                overlay_opacity:  preset.overlay_opacity,
                theme_preset_id:  preset.id,
              })}
              title={preset.name}
              style={{
                border: theme.theme_preset_id === preset.id ? "2px solid #c9a96e" : "1px solid rgba(0,0,0,0.1)",
                borderRadius: "0.5rem",
                overflow: "hidden",
                cursor: "pointer",
                background: "none",
                padding: 0,
                textAlign: "left",
              }}>
              <div style={{ height: 36, background: preset.hero_image_url ? `linear-gradient(135deg, ${preset.background_color}, ${preset.primary_color}30)` : preset.background_color, display: "flex", alignItems: "center", justifyContent: "center", gap: 4, padding: "0 8px" }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: preset.primary_color, flexShrink: 0 }} />
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: preset.accent_color, flexShrink: 0 }} />
                {preset.hero_image_url && <span style={{ fontSize: "0.55rem", color: preset.text_color, opacity: 0.6, marginLeft: 2 }}>+ IMG</span>}
              </div>
              <div style={{ padding: "0.3rem 0.5rem", background: "white" }}>
                <p style={{ fontSize: "0.675rem", fontWeight: 600, color: "#1c1917", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{preset.name}</p>
              </div>
            </button>
          ))}
        </div>
      </PanelSection>

      <PanelSection title="Couleurs personnalisées">
        <ColorRow label="Fond"               value={theme.background_color} onChange={(v) => updateTheme({ background_color: v })} />
        <ColorRow label="Texte"              value={theme.text_color}       onChange={(v) => updateTheme({ text_color: v })} />
        <ColorRow label="Couleur principale" value={theme.primary_color}    onChange={(v) => updateTheme({ primary_color: v })} />
        <ColorRow label="Accent"             value={theme.accent_color}     onChange={(v) => updateTheme({ accent_color: v })} />
      </PanelSection>

      <PanelSection title="Photo de fond">
        <BgImageUpload
          heroImageUrl={theme.hero_image_url}
          overlayOpacity={theme.overlay_opacity ?? 0.8}
          onUpdate={(u) => updateTheme(u)}
        />
      </PanelSection>

      <PanelSection title="Identité">

        <AvatarUpload
          avatarUrl={meta.avatar_url}
          onUpdate={(url) => updateMeta({ avatar_url: url })}
        />

        <PanelField label="Nom"        value={meta.name}     onChange={(v) => updateMeta({ name: v })} />
        <PanelField label="Titre"      value={meta.title}    onChange={(v) => updateMeta({ title: v })} />
        <PanelField label="Tagline"    value={meta.tagline}  onChange={(v) => updateMeta({ tagline: v })} />
        <PanelField label="Email"      value={meta.email}    onChange={(v) => updateMeta({ email: v })} />
        <PanelField label="GitHub URL" value={meta.github_url ?? ""}   onChange={(v) => updateMeta({ github_url: v || undefined })} />
        <PanelField label="LinkedIn"   value={meta.linkedin_url ?? ""} onChange={(v) => updateMeta({ linkedin_url: v || undefined })} />
      </PanelSection>
    </div>
  );
}

// ── Section editor (right panel — section selected) ───────────────────────────
const SECTION_LABELS: Record<string, string> = {
  hero: "Hero", about: "À propos", skills: "Compétences",
  projects: "Projets", experience: "Expérience", contact: "Contact",
};

function SectionEditor({ section, idx, updateSection, removeSection, onClose, meta, updateMeta }: {
  section: VSection;
  idx: number;
  updateSection: (i: number, s: VSection) => void;
  removeSection: (i: number) => void;
  onClose: () => void;
  meta: VMeta;
  updateMeta: (u: Partial<VMeta>) => void;
}) {
  const update = (s: VSection) => updateSection(idx, s);

  function handleRemove() {
    if (confirm(`Supprimer la section "${SECTION_LABELS[section.type] ?? section.type}" ?`)) {
      removeSection(idx);
    }
  }

  return (
    <div style={{ padding: "1.25rem" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
        <h2 style={{ fontSize: "0.8125rem", fontWeight: 600, color: "#1c1917" }}>{SECTION_LABELS[section.type] ?? section.type}</h2>
        <button onClick={onClose} style={{ color: "#a09a94", background: "none", border: "none", cursor: "pointer", fontSize: "1rem", lineHeight: 1 }}>✕</button>
      </div>

      {section.type === "hero" && <>
        <AvatarUpload
          avatarUrl={meta.avatar_url}
          onUpdate={(url) => updateMeta({ avatar_url: url })}
        />
        <div style={{ height: 1, background: "rgba(0,0,0,0.06)", margin: "0.75rem 0 1rem" }} />
        <PanelField label="Titre"           value={section.title}    onChange={(v) => update({ ...section, title: v })} />
        <PanelTextarea label="Sous-titre"   value={section.subtitle} onChange={(v) => update({ ...section, subtitle: v })} />
        <PanelField label="Texte du bouton" value={section.cta_text} onChange={(v) => update({ ...section, cta_text: v })} />
        <PanelField label="Lien du bouton"  value={section.cta_url}  onChange={(v) => update({ ...section, cta_url: v })} />
      </>}

      {section.type === "about" && <>
        <PanelTextarea label="Contenu"       value={section.content}      onChange={(v) => update({ ...section, content: v })} rows={5} />
        <PanelTextarea label="Citation (opt)" value={section.highlight ?? ""} onChange={(v) => update({ ...section, highlight: v || undefined })} />
      </>}

      {section.type === "skills" && (
        <div>
          <p style={{ fontSize: "0.725rem", color: "#a09a94", marginBottom: "0.875rem" }}>{section.items.length} compétences</p>
          {section.items.map((skill, si) => (
            <div key={si} style={{ marginBottom: "0.75rem", padding: "0.75rem", background: "white", borderRadius: "0.5rem", border: "1px solid rgba(0,0,0,0.06)" }}>
              <PanelField label="Nom" value={skill.name} onChange={(v) => {
                const items = section.items.map((item, j) => j === si ? { ...item, name: v } : item);
                update({ ...section, items });
              }} />
              <div style={{ marginBottom: "0.625rem" }}>
                <label style={{ display: "block", fontSize: "0.7rem", color: "#78716c", marginBottom: "0.2rem" }}>Niveau — {skill.level}/5</label>
                <input type="range" min={1} max={5} value={skill.level}
                  onChange={(e) => {
                    const items = section.items.map((item, j) => j === si ? { ...item, level: Number(e.target.value) } : item);
                    update({ ...section, items });
                  }}
                  style={{ width: "100%", accentColor: "#c9a96e" }} />
              </div>
              <PanelField label="Catégorie" value={skill.category} onChange={(v) => {
                const items = section.items.map((item, j) => j === si ? { ...item, category: v } : item);
                update({ ...section, items });
              }} />
            </div>
          ))}
        </div>
      )}

      {section.type === "projects" && (
        <div>
          {section.items.map((project, pi) => (
            <div key={pi} style={{ marginBottom: "0.75rem", padding: "0.75rem", background: "white", borderRadius: "0.5rem", border: "1px solid rgba(0,0,0,0.06)" }}>
              <p style={{ fontSize: "0.7rem", fontWeight: 600, color: "#a09a94", marginBottom: "0.5rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Projet {pi + 1}</p>
              <PanelField label="Nom" value={project.name} onChange={(v) => {
                const items = section.items.map((item, j) => j === pi ? { ...item, name: v } : item);
                update({ ...section, items });
              }} />
              <PanelTextarea label="Description" value={project.description} onChange={(v) => {
                const items = section.items.map((item, j) => j === pi ? { ...item, description: v } : item);
                update({ ...section, items });
              }} />
              <PanelField label="Stack (virgule)" value={project.tech_stack.join(", ")} onChange={(v) => {
                const items = section.items.map((item, j) => j === pi ? { ...item, tech_stack: v.split(",").map(s => s.trim()).filter(Boolean) } : item);
                update({ ...section, items });
              }} />
            </div>
          ))}
        </div>
      )}

      {section.type === "experience" && (
        <div>
          {section.items.map((exp, ei) => (
            <div key={ei} style={{ marginBottom: "0.75rem", padding: "0.75rem", background: "white", borderRadius: "0.5rem", border: "1px solid rgba(0,0,0,0.06)" }}>
              <p style={{ fontSize: "0.7rem", fontWeight: 600, color: "#a09a94", marginBottom: "0.5rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Poste {ei + 1}</p>
              <PanelField label="Rôle"       value={exp.role}    onChange={(v) => { const items = section.items.map((item, j) => j === ei ? { ...item, role: v } : item); update({ ...section, items }); }} />
              <PanelField label="Entreprise" value={exp.company} onChange={(v) => { const items = section.items.map((item, j) => j === ei ? { ...item, company: v } : item); update({ ...section, items }); }} />
              <PanelField label="Période"    value={exp.period}  onChange={(v) => { const items = section.items.map((item, j) => j === ei ? { ...item, period: v } : item); update({ ...section, items }); }} />
              <PanelTextarea label="Description" value={exp.description} onChange={(v) => { const items = section.items.map((item, j) => j === ei ? { ...item, description: v } : item); update({ ...section, items }); }} />
            </div>
          ))}
        </div>
      )}

      {section.type === "contact" && <>
        <PanelField    label="Email"   value={section.email}   onChange={(v) => update({ ...section, email: v })} />
        <PanelTextarea label="Message" value={section.message} onChange={(v) => update({ ...section, message: v })} />
      </>}

      {section.type !== "hero" && (
        <div style={{ marginTop: "1.5rem", paddingTop: "1rem", borderTop: "1px solid rgba(0,0,0,0.06)" }}>
          <button onClick={handleRemove}
            style={{ width: "100%", padding: "0.5rem", fontSize: "0.75rem", color: "#dc2626", background: "rgba(220,38,38,0.05)", border: "1px solid rgba(220,38,38,0.15)", borderRadius: "0.5rem", cursor: "pointer" }}>
            Supprimer cette section
          </button>
        </div>
      )}
    </div>
  );
}

// ── Shared UI primitives ──────────────────────────────────────────────────────
function AvatarUpload({ avatarUrl, onUpdate }: { avatarUrl?: string; onUpdate: (url: string | undefined) => void }) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const dataUrl = await resizeImage(file);
      onUpdate(dataUrl);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  return (
    <div style={{ marginBottom: "0.875rem" }}>
      <label style={{ display: "block", fontSize: "0.7rem", color: "#78716c", marginBottom: "0.5rem" }}>Photo principale</label>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        {/* Preview circle */}
        <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#f0ece6", border: "1px solid rgba(0,0,0,0.1)", overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {avatarUrl
            ? <img src={avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : <span style={{ fontSize: "1.375rem", color: "#c8c4bf" }}>+</span>
          }
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: "none" }} onChange={handleChange} />
          <button
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            style={{ display: "block", width: "100%", padding: "0.45rem 0.625rem", fontSize: "0.7375rem", color: "#1c1917", background: "white", border: "1px solid rgba(0,0,0,0.1)", borderRadius: "0.4rem", cursor: uploading ? "wait" : "pointer", marginBottom: "0.3rem", textAlign: "center", fontWeight: 500 }}
          >
            {uploading ? "Chargement…" : avatarUrl ? "Changer la photo" : "Ajouter une photo"}
          </button>
          {avatarUrl && (
            <button
              onClick={() => onUpdate(undefined)}
              style={{ fontSize: "0.675rem", color: "#a09a94", background: "none", border: "none", cursor: "pointer", padding: 0, width: "100%", textAlign: "center" }}
            >
              Supprimer
            </button>
          )}
        </div>
      </div>
      <p style={{ fontSize: "0.625rem", color: "#c8c4bf", marginTop: "0.375rem" }}>JPG · PNG · WebP — max 400×400px</p>
    </div>
  );
}

function BgImageUpload({ heroImageUrl, overlayOpacity, onUpdate }: {
  heroImageUrl?: string;
  overlayOpacity: number;
  onUpdate: (u: { hero_image_url?: string; overlay_opacity?: number }) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const dataUrl = await resizeImage(file, 1920, 0.75);
      onUpdate({ hero_image_url: dataUrl });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  return (
    <div style={{ marginBottom: "0.875rem" }}>
      {/* Thumbnail + buttons */}
      <div style={{ position: "relative", width: "100%", height: 80, borderRadius: "0.5rem", overflow: "hidden", background: "#f0ece6", border: "1px solid rgba(0,0,0,0.1)", marginBottom: "0.5rem", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {heroImageUrl
          ? <img src={heroImageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : <span style={{ fontSize: "0.75rem", color: "#c8c4bf" }}>Aucune photo de fond</span>
        }
        {heroImageUrl && (
          <button onClick={() => onUpdate({ hero_image_url: undefined })}
            style={{ position: "absolute", top: 4, right: 4, width: 20, height: 20, borderRadius: "50%", background: "rgba(0,0,0,0.6)", color: "white", border: "none", cursor: "pointer", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
            ✕
          </button>
        )}
      </div>

      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: "none" }} onChange={handleChange} />
      <button onClick={() => inputRef.current?.click()} disabled={uploading}
        style={{ width: "100%", padding: "0.4rem 0.625rem", fontSize: "0.7375rem", color: "#1c1917", background: "white", border: "1px solid rgba(0,0,0,0.1)", borderRadius: "0.4rem", cursor: uploading ? "wait" : "pointer", textAlign: "center", fontWeight: 500, marginBottom: "0.625rem" }}>
        {uploading ? "Chargement…" : heroImageUrl ? "Changer la photo" : "Choisir depuis l'appareil"}
      </button>

      {/* Opacity slider — only shown when image is set */}
      {heroImageUrl && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.2rem" }}>
            <label style={{ fontSize: "0.7rem", color: "#78716c" }}>Opacité du fond coloré</label>
            <span style={{ fontSize: "0.7rem", color: "#a09a94" }}>{Math.round(overlayOpacity * 100)}%</span>
          </div>
          <input type="range" min={0} max={1} step={0.05} value={overlayOpacity}
            onChange={(e) => onUpdate({ overlay_opacity: Number(e.target.value) })}
            style={{ width: "100%", accentColor: "#c9a96e" }} />
          <p style={{ fontSize: "0.625rem", color: "#c8c4bf", marginTop: "0.2rem" }}>0% = photo seule · 100% = fond couleur seul</p>
        </div>
      )}
    </div>
  );
}

function PanelSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "1.25rem" }}>
      <p style={{ fontSize: "0.675rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#a09a94", marginBottom: "0.625rem" }}>{title}</p>
      {children}
    </div>
  );
}

function ColorRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.4rem 0", borderBottom: "1px solid rgba(0,0,0,0.045)" }}>
      <label style={{ fontSize: "0.7875rem", color: "#78716c" }}>{label}</label>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <span style={{ fontSize: "0.7rem", fontFamily: "monospace", color: "#a09a94" }}>{value}</span>
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)}
          style={{ width: 26, height: 26, border: "none", borderRadius: 6, padding: 0, cursor: "pointer", background: "none" }} />
      </div>
    </div>
  );
}

function PanelField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ marginBottom: "0.625rem" }}>
      <label style={{ display: "block", fontSize: "0.7rem", color: "#78716c", marginBottom: "0.2rem" }}>{label}</label>
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)}
        style={{ width: "100%", padding: "0.4rem 0.625rem", fontSize: "0.7875rem", color: "#1c1917", background: "white", border: "1px solid rgba(0,0,0,0.1)", borderRadius: "0.4rem", outline: "none", boxSizing: "border-box" }} />
    </div>
  );
}

function PanelTextarea({ label, value, onChange, rows = 3 }: { label: string; value: string; onChange: (v: string) => void; rows?: number }) {
  return (
    <div style={{ marginBottom: "0.625rem" }}>
      <label style={{ display: "block", fontSize: "0.7rem", color: "#78716c", marginBottom: "0.2rem" }}>{label}</label>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows}
        style={{ width: "100%", padding: "0.4rem 0.625rem", fontSize: "0.7875rem", color: "#1c1917", background: "white", border: "1px solid rgba(0,0,0,0.1)", borderRadius: "0.4rem", outline: "none", resize: "vertical", fontFamily: "inherit", boxSizing: "border-box" }} />
    </div>
  );
}
