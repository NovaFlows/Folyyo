"use client";

import { useEffect, useState } from "react";

const TABS = [
  { id: "developer", label: "Développeur", url: "alex-martin.folyyo.app" },
  { id: "artist",    label: "Artiste",     url: "sophie-noir.folyyo.app" },
  { id: "fashion",   label: "Mode",        url: "nina-beaumont.folyyo.app" },
  { id: "musicien",  label: "Musique",     url: "solka.folyyo.app" },
] as const;

const AUTOPLAY_MS = 6000;

export default function PortfolioPreviews() {
  const [index, setIndex]   = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % TABS.length), AUTOPLAY_MS);
    return () => clearInterval(t);
  }, [paused]);

  const go = (i: number) => setIndex((i + TABS.length) % TABS.length);

  return (
    <div className="w-full" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      {/* Tabs */}
      <div className="mb-10 flex flex-wrap justify-center gap-1">
        {TABS.map((tab, i) => (
          <button
            key={tab.id}
            onClick={() => setIndex(i)}
            className={`rounded-full px-6 py-2 text-sm transition-all duration-200 ${
              i === index
                ? "bg-[#1c1917] text-white"
                : "text-[#78716c] hover:text-[#1c1917]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Browser frame + carousel arrows */}
      <div className="relative mx-auto max-w-4xl">
        <button onClick={() => go(index - 1)} aria-label="Exemple précédent"
          className="absolute left-0 top-1/2 z-10 hidden h-10 w-10 -translate-x-14 -translate-y-1/2 items-center justify-center rounded-full border border-black/8 bg-white text-[#78716c] transition hover:border-black/15 hover:text-[#1c1917] lg:flex">
          ‹
        </button>
        <button onClick={() => go(index + 1)} aria-label="Exemple suivant"
          className="absolute right-0 top-1/2 z-10 hidden h-10 w-10 translate-x-14 -translate-y-1/2 items-center justify-center rounded-full border border-black/8 bg-white text-[#78716c] transition hover:border-black/15 hover:text-[#1c1917] lg:flex">
          ›
        </button>

        <div className="overflow-hidden rounded-2xl border border-black/8 shadow-2xl shadow-black/10">
          {/* Browser bar */}
          <div className="flex items-center gap-3 border-b border-black/6 bg-[#f0ece6] px-4 py-3">
            <div className="flex gap-1.5">
              <div className="h-3 w-3 rounded-full bg-black/10" />
              <div className="h-3 w-3 rounded-full bg-black/10" />
              <div className="h-3 w-3 rounded-full bg-black/10" />
            </div>
            <div className="flex-1 rounded-md bg-white/70 px-3 py-1 text-center text-xs text-[#78716c]" style={{ fontFamily: "monospace" }}>
              {TABS[index].url}
            </div>
          </div>

          {/* Content — crossfade carousel */}
          <div className="relative h-[480px] overflow-hidden">
            {TABS.map((tab, i) => (
              <div key={tab.id}
                className="absolute inset-0 transition-opacity duration-500 ease-in-out"
                style={{ opacity: i === index ? 1 : 0, pointerEvents: i === index ? "auto" : "none" }}>
                {tab.id === "developer" && <DeveloperPreview />}
                {tab.id === "artist"    && <ArtistPreview />}
                {tab.id === "fashion"   && <FashionPreview />}
                {tab.id === "musicien"  && <MusicianPreview />}
              </div>
            ))}
          </div>
        </div>

        {/* Dots (mobile-friendly nav, mirrors tabs) */}
        <div className="mt-5 flex justify-center gap-2 lg:hidden">
          {TABS.map((tab, i) => (
            <button key={tab.id} onClick={() => setIndex(i)} aria-label={`Aller à ${tab.label}`}
              className="h-1.5 rounded-full transition-all"
              style={{ width: i === index ? 18 : 7, background: i === index ? "#1c1917" : "rgba(0,0,0,0.15)" }} />
          ))}
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

function MusicianPreview() {
  return (
    <div className="h-full overflow-y-auto bg-[#0a0a0f] text-white" style={{ fontFamily: "Inter, sans-serif" }}>
      <nav className="flex items-center justify-between px-8 py-5 border-b border-white/5">
        <span className="text-sm font-semibold tracking-wide" style={{ fontFamily: "'Playfair Display', Georgia, serif", color: "#e879f9" }}>SOLKA</span>
        <div className="flex gap-6 text-xs text-white/25">
          <span>Discographie</span><span>Scène</span><span>Contact</span>
        </div>
      </nav>
      <div className="px-8 py-10">
        <p className="text-xs mb-2" style={{ color: "rgba(232,121,249,0.6)" }}>Rappeur</p>
        <h1 className="text-4xl font-bold mb-3 text-white">SOLKA</h1>
        <p className="text-white/40 text-sm leading-relaxed max-w-md mb-8">
          Rap authentique, textes qui touchent. Un univers en construction — et ça monte vite.
        </p>
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            { v: "1,3k", l: "Abonnés" },
            { v: "14",   l: "Titres" },
            { v: "8,4k", l: "Vues" },
          ].map((s) => (
            <div key={s.l} className="rounded-xl border border-white/6 bg-white/2 p-4 text-center">
              <p className="text-xl font-bold" style={{ color: "#e879f9" }}>{s.v}</p>
              <p className="text-white/30 text-xs mt-1">{s.l}</p>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[
            { name: "Marty Bird",   tag: "Clip officiel" },
            { name: "Hermès",       tag: "Single" },
            { name: "Tunnel",       tag: "Freestyle" },
            { name: "Nuit blanche", tag: "Feat." },
          ].map((t) => (
            <div key={t.name} className="rounded-xl border border-white/6 bg-white/2 p-4">
              <div className="mb-2 h-16 rounded-md" style={{ background: "linear-gradient(135deg, rgba(232,121,249,0.2), rgba(28,25,23,0))" }} />
              <p className="text-sm font-semibold text-white/80">{t.name}</p>
              <p className="text-white/25 text-xs">{t.tag}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
