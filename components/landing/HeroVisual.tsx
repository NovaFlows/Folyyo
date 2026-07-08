// Decorative hero composition: tilted CV + post-it notes
// aria-hidden — purely visual, no semantic content
export default function HeroVisual() {
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

      {/* ── CV Card ─────────────────────────────── */}
      <div style={{
        position: "absolute",
        inset: "18px 22px",
        background: "white",
        borderRadius: 12,
        transform: "rotate(-4deg) translateY(4px)",
        boxShadow: "0 6px 24px rgba(0,0,0,0.06), 0 24px 64px rgba(0,0,0,0.07)",
        padding: "22px 20px 28px",
        zIndex: 5,
        overflow: "hidden",
      }}>

        {/* CV Header: avatar + name + title */}
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

        {/* Contact bar */}
        <div style={{
          display: "flex", gap: 7, marginBottom: 16,
          paddingBottom: 14, borderBottom: "1px solid #f0ece6",
        }}>
          {[68, 82, 72].map((w, i) => (
            <div key={i} style={{ height: 5, width: w, background: "#ede9e4", borderRadius: 3 }} />
          ))}
        </div>

        {/* Experience */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ height: 6, width: 78, background: "#1c1917", borderRadius: 2, marginBottom: 9, opacity: 0.82 }} />

          {/* Job 1 */}
          <div style={{ marginBottom: 9 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <div style={{ height: 6, width: 86, background: "#1c1917", borderRadius: 2, opacity: 0.68 }} />
              <div style={{ height: 5, width: 48, background: "#ede9e4", borderRadius: 2 }} />
            </div>
            <div style={{ height: 5, width: 104, background: "#c9a96e", borderRadius: 2, opacity: 0.42, marginBottom: 5 }} />
            {[148, 128, 108].map((w, i) => (
              <div key={i} style={{ height: 4, width: w, background: "#f0ece6", borderRadius: 2, marginBottom: 3 }} />
            ))}
          </div>

          {/* Job 2 */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <div style={{ height: 6, width: 76, background: "#1c1917", borderRadius: 2, opacity: 0.68 }} />
              <div style={{ height: 5, width: 44, background: "#ede9e4", borderRadius: 2 }} />
            </div>
            <div style={{ height: 5, width: 96, background: "#c9a96e", borderRadius: 2, opacity: 0.42, marginBottom: 5 }} />
            {[134, 114].map((w, i) => (
              <div key={i} style={{ height: 4, width: w, background: "#f0ece6", borderRadius: 2, marginBottom: 3 }} />
            ))}
          </div>
        </div>

        {/* Skills */}
        <div style={{ marginBottom: 14, paddingTop: 12, borderTop: "1px solid #f0ece6" }}>
          <div style={{ height: 6, width: 94, background: "#1c1917", borderRadius: 2, marginBottom: 9, opacity: 0.82 }} />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
            {["React", "TypeScript", "Node.js", "Python", "SQL", "Docker"].map((tag) => (
              <span key={tag} style={{
                fontSize: "0.5rem",
                padding: "2.5px 7px",
                borderRadius: 100,
                background: "rgba(201,169,110,0.1)",
                color: "#c9a96e",
                fontFamily: "'JetBrains Mono', monospace",
                letterSpacing: "0.02em",
                lineHeight: 1.6,
              }}>{tag}</span>
            ))}
          </div>
        </div>

        {/* Projects */}
        <div style={{ paddingTop: 12, borderTop: "1px solid #f0ece6" }}>
          <div style={{ height: 6, width: 58, background: "#1c1917", borderRadius: 2, marginBottom: 9, opacity: 0.82 }} />
          {[148, 126, 104].map((w, i) => (
            <div key={i} style={{ height: 4, width: w, background: "#f0ece6", borderRadius: 2, marginBottom: 4 }} />
          ))}
        </div>

        {/* Folyyo stamp — bottom right */}
        <div style={{
          position: "absolute", bottom: 12, right: 14,
          transform: "rotate(-2deg)",
          display: "flex", alignItems: "center", gap: 4,
          opacity: 0.3,
        }}>
          <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
            <circle cx="4.5" cy="4.5" r="3.8" stroke="#c9a96e" strokeWidth="1.2"/>
            <path d="M2.8 4.5l1.2 1.2 2.2-2.2" stroke="#c9a96e" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span style={{ fontSize: "0.5rem", color: "#c9a96e", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.06em" }}>
            folyyo
          </span>
        </div>

        {/* Bottom fade */}
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0, height: 52,
          background: "linear-gradient(to bottom, transparent, white)",
          pointerEvents: "none",
        }} />
      </div>

      {/* ── Post-it 1 : "< 60s" — top right ───── */}
      <div style={{
        position: "absolute", top: -6, right: -6, zIndex: 14,
        background: "#fffdf0",
        borderTop: "3px solid #f0d98a",
        borderRadius: "2px 6px 6px 2px",
        padding: "13px 15px 11px",
        transform: "rotate(5.5deg)",
        boxShadow: "2px 5px 18px rgba(0,0,0,0.10), 0 1px 3px rgba(0,0,0,0.06)",
        minWidth: 82,
      }}>
        <p style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: "1.5rem", fontWeight: 500,
          color: "#1c1917", lineHeight: 1, marginBottom: 5,
        }}>{"<60s"}</p>
        <p style={{ fontSize: "0.575rem", color: "#a09a94", fontFamily: "'JetBrains Mono', monospace" }}>génération</p>
      </div>

      {/* ── Post-it 2 : terminal badge — top left ─ */}
      <div style={{
        position: "absolute", top: 28, left: 0, zIndex: 14,
        background: "#111318",
        borderRadius: 6,
        padding: "7px 11px",
        transform: "rotate(-3.5deg)",
        boxShadow: "2px 4px 14px rgba(0,0,0,0.22)",
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
      <div style={{
        position: "absolute", top: "44%", left: -8, zIndex: 13,
        background: "white",
        borderTop: "3px solid #e2ddd8",
        borderRadius: "2px 6px 6px 2px",
        padding: "9px 13px 9px",
        transform: "rotate(-4.5deg)",
        boxShadow: "2px 4px 14px rgba(0,0,0,0.09), 0 1px 2px rgba(0,0,0,0.04)",
      }}>
        <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.5rem", color: "#c8c4bf", marginBottom: 3, letterSpacing: "0.03em" }}>
          ton url
        </p>
        <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.6875rem", color: "#1c1917", whiteSpace: "nowrap" }}>
          folyyo.com/<span style={{ color: "#c9a96e" }}>alex</span>
        </p>
      </div>

      {/* ── Post-it 4 : "1 247" — bottom left ──── */}
      <div style={{
        position: "absolute", bottom: 20, left: -4, zIndex: 14,
        background: "#f0ece6",
        borderTop: "3px solid #d4cec8",
        borderRadius: "2px 6px 6px 2px",
        padding: "12px 15px 11px",
        transform: "rotate(-5.5deg)",
        boxShadow: "2px 5px 16px rgba(0,0,0,0.09)",
      }}>
        <p style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: "1.375rem", fontWeight: 500,
          color: "#1c1917", lineHeight: 1, marginBottom: 4,
        }}>1 247</p>
        <p style={{ fontSize: "0.575rem", color: "#a09a94" }}>portfolios créés</p>
      </div>

    </div>
  );
}
