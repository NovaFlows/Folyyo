"use client";

import { useState } from "react";

const TABS = [
  { id: "developer", label: "Développeur" },
  { id: "artist",    label: "Artiste"      },
  { id: "fashion",   label: "Mode"          },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function PortfolioPreviews() {
  const [active, setActive] = useState<TabId>("developer");

  return (
    <div className="w-full">
      {/* Tabs */}
      <div className="mb-10 flex justify-center gap-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActive(tab.id)}
            className={`rounded-full px-6 py-2 text-sm transition-all duration-200 ${
              active === tab.id
                ? "bg-[#1c1917] text-white"
                : "text-[#78716c] hover:text-[#1c1917]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Browser frame */}
      <div className="relative mx-auto max-w-4xl">
        <div className="overflow-hidden rounded-2xl border border-black/8 shadow-2xl shadow-black/10">
          {/* Browser bar */}
          <div className="flex items-center gap-3 border-b border-black/6 bg-[#f0ece6] px-4 py-3">
            <div className="flex gap-1.5">
              <div className="h-3 w-3 rounded-full bg-black/10" />
              <div className="h-3 w-3 rounded-full bg-black/10" />
              <div className="h-3 w-3 rounded-full bg-black/10" />
            </div>
            <div className="flex-1 rounded-md bg-white/70 px-3 py-1 text-center text-xs text-[#78716c]" style={{ fontFamily: "monospace" }}>
              {active === "developer" && "alex-martin.folyyo.app"}
              {active === "artist"    && "sophie-noir.folyyo.app"}
              {active === "fashion"   && "nina-beaumont.folyyo.app"}
            </div>
          </div>

          {/* Content */}
          <div className="h-[480px] overflow-hidden">
            {active === "developer" && <DeveloperPreview />}
            {active === "artist"    && <ArtistPreview />}
            {active === "fashion"   && <FashionPreview />}
          </div>
        </div>
      </div>

      <p className="mt-6 text-center text-sm text-[#a09a94]">
        Généré et déployé automatiquement · Éditable à tout moment
      </p>
    </div>
  );
}

function DeveloperPreview() {
  return (
    <div className="h-full overflow-y-auto bg-[#0f1117] text-white" style={{ fontFamily: "monospace" }}>
      <nav className="flex items-center justify-between px-8 py-5 border-b border-white/5">
        <span className="text-sm font-semibold text-[#c9a96e]">alex.dev</span>
        <div className="flex gap-6 text-xs text-white/30">
          <span>about</span><span>projets</span><span>contact</span>
        </div>
      </nav>
      <div className="px-8 py-10">
        <p className="text-xs text-[#c9a96e]/60 mb-2">fullstack engineer</p>
        <h1 className="text-4xl font-bold mb-3 text-white">Alex Martin</h1>
        <p className="text-white/40 text-sm leading-relaxed max-w-md mb-8">
          Je construis des APIs rapides et des interfaces propres. 5 ans d&apos;expérience. Open source enthusiast.
        </p>
        <div className="flex flex-wrap gap-2 mb-10">
          {["TypeScript","React","Node.js","PostgreSQL","Docker"].map((t) => (
            <span key={t} className="rounded-md border border-white/8 px-2.5 py-1 text-xs text-white/40">{t}</span>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[
            { name: "fastq", desc: "Message queue ultra-rapide", stars: 1247 },
            { name: "pgmigrate", desc: "Migrations de bases de données", stars: 384 },
            { name: "opentype-rs", desc: "Parser de polices de caractères", stars: 217 },
            { name: "reactable", desc: "Tables réactives sans dépendances", stars: 892 },
          ].map((p) => (
            <div key={p.name} className="rounded-xl border border-white/6 bg-white/2 p-4">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[#c9a96e] text-sm font-semibold">{p.name}</span>
                <span className="text-white/20 text-xs">★ {p.stars}</span>
              </div>
              <p className="text-white/35 text-xs">{p.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ArtistPreview() {
  return (
    <div className="h-full overflow-y-auto bg-[#f5f3ef] text-[#1c1917]" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
      <nav className="flex items-center justify-between px-8 py-5 border-b border-black/6">
        <span className="text-sm tracking-[0.2em] uppercase text-[#78716c]" style={{ fontFamily: "Inter, sans-serif" }}>Sophie Noir</span>
        <div className="flex gap-8 text-xs tracking-[0.15em] uppercase text-[#a09a94]" style={{ fontFamily: "Inter, sans-serif" }}>
          <span>Works</span><span>Studio</span><span>Contact</span>
        </div>
      </nav>
      <div className="px-8 pt-6 pb-4">
        <p className="text-xs tracking-widest uppercase text-[#a09a94] mb-1" style={{ fontFamily: "Inter, sans-serif" }}>Peinture · Illustration · Paris</p>
        <h1 className="text-3xl font-light text-[#44403c] mb-6">Œuvres récentes</h1>
        <div className="grid grid-cols-3 gap-2">
          {[
            { bg: "#1c1c2e", h: "pb-[140%]" },
            { bg: "#c9b99a", h: "pb-[100%]" },
            { bg: "#2d4a3e", h: "pb-[120%]" },
            { bg: "#e8c97a", h: "pb-[80%]"  },
            { bg: "#4a2d3e", h: "pb-[110%]" },
            { bg: "#8b6b4a", h: "pb-[90%]"  },
          ].map((item, i) => (
            <div key={i} className={`relative w-full ${item.h} rounded-sm`} style={{ background: item.bg }} />
          ))}
        </div>
      </div>
      <div className="px-8 pb-8 pt-4">
        <p className="text-sm text-[#78716c] leading-relaxed max-w-sm italic">
          Mon travail explore la tension entre l&apos;organique et le géométrique. Expositions à Paris, Berlin et Tokyo.
        </p>
      </div>
    </div>
  );
}

function FashionPreview() {
  return (
    <div className="relative h-full overflow-hidden bg-[#0a0808] text-white" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 70% 25%, rgba(201,169,110,0.1) 0%, transparent 60%)" }} />
      <div className="absolute right-0 top-0 h-full w-[42%]">
        <div className="absolute right-6 top-4 h-60 w-36 rounded-sm" style={{ background: "linear-gradient(160deg, #2a1a14, #0f0a08)" }} />
        <div className="absolute right-16 top-16 h-44 w-24 rounded-sm opacity-50" style={{ background: "linear-gradient(160deg, #1e1410, #0a0806)" }} />
        <div className="absolute right-3 top-48 h-32 w-20 rounded-sm opacity-30" style={{ background: "linear-gradient(160deg, #3a2016, #120c09)" }} />
      </div>
      <nav className="relative z-10 flex items-center justify-between px-8 py-5">
        <span className="text-xs tracking-[0.35em] uppercase text-white/30" style={{ fontFamily: "Inter, sans-serif" }}>NB</span>
        <div className="flex gap-6 text-xs tracking-[0.2em] uppercase text-white/20" style={{ fontFamily: "Inter, sans-serif" }}>
          <span>Portfolio</span><span>About</span><span>Book</span>
        </div>
      </nav>
      <div className="relative z-10 flex h-[calc(100%-64px)] flex-col justify-end px-8 pb-10">
        <p className="mb-2 text-xs tracking-[0.3em] uppercase text-[#c9a96e]/50" style={{ fontFamily: "Inter, sans-serif" }}>Model · Creative Director</p>
        <h1 className="text-5xl font-light leading-[1.1] tracking-tight mb-1">Nina</h1>
        <h1 className="text-5xl font-light leading-[1.1] tracking-tight text-white/50 mb-5">Beaumont</h1>
        <p className="mb-7 max-w-[220px] text-sm text-white/35 leading-relaxed" style={{ fontFamily: "Inter, sans-serif" }}>
          Paris · Milan · New York<br />
          <span className="text-white/20 text-xs">Saint Laurent · Jacquemus · A.P.C.</span>
        </p>
        <div className="flex gap-3">
          <button className="rounded-full border border-white/12 px-5 py-2 text-xs tracking-widest uppercase text-white/40 hover:border-white/25 transition-colors" style={{ fontFamily: "Inter, sans-serif" }}>
            Book →
          </button>
          <button className="rounded-full border border-[#c9a96e]/20 bg-[#c9a96e]/8 px-5 py-2 text-xs tracking-widest uppercase text-[#c9a96e]/50" style={{ fontFamily: "Inter, sans-serif" }}>
            Contact
          </button>
        </div>
      </div>
    </div>
  );
}
