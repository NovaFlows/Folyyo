"use client";

import { useEffect, useState } from "react";
import type { Locale } from "@/lib/i18n/types";

const TABS = {
  fr: [
    { id: "developer", label: "Développeur", url: "alex-martin.folyyo.app" },
    { id: "artist",    label: "Artiste",     url: "sophie-noir.folyyo.app" },
    { id: "fashion",   label: "Mode",        url: "nina-beaumont.folyyo.app" },
    { id: "musicien",  label: "Musique",     url: "solka.folyyo.app" },
  ],
  en: [
    { id: "developer", label: "Developer", url: "alex-martin.folyyo.app" },
    { id: "artist",    label: "Artist",    url: "sophie-noir.folyyo.app" },
    { id: "fashion",   label: "Fashion",   url: "nina-beaumont.folyyo.app" },
    { id: "musicien",  label: "Music",     url: "solka.folyyo.app" },
  ],
  es: [
    { id: "developer", label: "Desarrollador", url: "alex-martin.folyyo.app" },
    { id: "artist",    label: "Artista",       url: "sophie-noir.folyyo.app" },
    { id: "fashion",   label: "Moda",          url: "nina-beaumont.folyyo.app" },
    { id: "musicien",  label: "Música",        url: "solka.folyyo.app" },
  ],
} as const;

const STRINGS = {
  fr: { prev: "Exemple précédent", next: "Exemple suivant", goTo: (label: string) => `Aller à ${label}`, footer: "Généré et déployé automatiquement · Éditable à tout moment" },
  en: { prev: "Previous example", next: "Next example", goTo: (label: string) => `Go to ${label}`, footer: "Generated and deployed automatically · Editable anytime" },
  es: { prev: "Ejemplo anterior", next: "Ejemplo siguiente", goTo: (label: string) => `Ir a ${label}`, footer: "Generado y publicado automáticamente · Editable en cualquier momento" },
};

const AUTOPLAY_MS = 6000;

export default function PortfolioPreviews({ locale }: { locale: Locale }) {
  const tabs = TABS[locale];
  const s = STRINGS[locale];
  const [index, setIndex]   = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % tabs.length), AUTOPLAY_MS);
    return () => clearInterval(t);
  }, [paused, tabs.length]);

  const go = (i: number) => setIndex((i + tabs.length) % tabs.length);

  return (
    <div className="w-full" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      {/* Tabs */}
      <div className="mb-10 flex flex-wrap justify-center gap-1">
        {tabs.map((tab, i) => (
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
        <button onClick={() => go(index - 1)} aria-label={s.prev}
          className="absolute left-0 top-1/2 z-10 hidden h-10 w-10 -translate-x-14 -translate-y-1/2 items-center justify-center rounded-full border border-black/8 bg-white text-[#78716c] transition hover:border-black/15 hover:text-[#1c1917] lg:flex">
          ‹
        </button>
        <button onClick={() => go(index + 1)} aria-label={s.next}
          className="absolute right-0 top-1/2 z-10 hidden h-10 w-10 translate-x-14 -translate-y-1/2 items-center justify-center rounded-full border border-black/8 bg-white text-[#78716c] transition hover:border-black/15 hover:text-[#1c1917] lg:flex">
          ›
        </button>

        <div className="ld-tilt overflow-hidden rounded-2xl border border-black/8 shadow-2xl shadow-black/10">
          {/* Browser bar */}
          <div className="flex items-center gap-3 border-b border-black/6 bg-[#f0ece6] px-4 py-3">
            <div className="flex gap-1.5">
              <div className="h-3 w-3 rounded-full bg-black/10" />
              <div className="h-3 w-3 rounded-full bg-black/10" />
              <div className="h-3 w-3 rounded-full bg-black/10" />
            </div>
            <div className="flex-1 rounded-md bg-white/70 px-3 py-1 text-center text-xs text-[#78716c]" style={{ fontFamily: "monospace" }}>
              {tabs[index].url}
            </div>
          </div>

          {/* Content — crossfade carousel */}
          <div className="relative h-[480px] overflow-hidden">
            {tabs.map((tab, i) => (
              <div key={tab.id}
                className="absolute inset-0 transition-opacity duration-500 ease-in-out"
                style={{ opacity: i === index ? 1 : 0, pointerEvents: i === index ? "auto" : "none" }}>
                {tab.id === "developer" && <DeveloperPreview locale={locale} />}
                {tab.id === "artist"    && <ArtistPreview locale={locale} />}
                {tab.id === "fashion"   && <FashionPreview locale={locale} />}
                {tab.id === "musicien"  && <MusicianPreview locale={locale} />}
              </div>
            ))}
          </div>
        </div>

        {/* Dots (mobile-friendly nav, mirrors tabs) */}
        <div className="mt-5 flex justify-center gap-2 lg:hidden">
          {tabs.map((tab, i) => (
            <button key={tab.id} onClick={() => setIndex(i)} aria-label={s.goTo(tab.label)}
              className="h-1.5 rounded-full transition-all"
              style={{ width: i === index ? 18 : 7, background: i === index ? "#1c1917" : "rgba(0,0,0,0.15)" }} />
          ))}
        </div>
      </div>

      <p className="mt-6 text-center text-sm text-[#a09a94]">
        {s.footer}
      </p>
    </div>
  );
}

const DEVELOPER_CONTENT = {
  fr: {
    nav: ["about", "projets", "contact"],
    role: "fullstack engineer",
    bio: "Je construis des APIs rapides et des interfaces propres. 5 ans d'expérience. Open source enthusiast.",
    projects: [
      { name: "fastq", desc: "Message queue ultra-rapide", stars: 1247 },
      { name: "pgmigrate", desc: "Migrations de bases de données", stars: 384 },
      { name: "opentype-rs", desc: "Parser de polices de caractères", stars: 217 },
      { name: "reactable", desc: "Tables réactives sans dépendances", stars: 892 },
    ],
  },
  en: {
    nav: ["about", "projects", "contact"],
    role: "fullstack engineer",
    bio: "I build fast APIs and clean interfaces. 5 years of experience. Open source enthusiast.",
    projects: [
      { name: "fastq", desc: "Ultra-fast message queue", stars: 1247 },
      { name: "pgmigrate", desc: "Database migrations", stars: 384 },
      { name: "opentype-rs", desc: "Font file parser", stars: 217 },
      { name: "reactable", desc: "Dependency-free reactive tables", stars: 892 },
    ],
  },
  es: {
    nav: ["about", "proyectos", "contacto"],
    role: "ingeniero fullstack",
    bio: "Construyo APIs rápidas e interfaces limpias. 5 años de experiencia. Entusiasta del open source.",
    projects: [
      { name: "fastq", desc: "Cola de mensajes ultrarrápida", stars: 1247 },
      { name: "pgmigrate", desc: "Migraciones de bases de datos", stars: 384 },
      { name: "opentype-rs", desc: "Parser de fuentes tipográficas", stars: 217 },
      { name: "reactable", desc: "Tablas reactivas sin dependencias", stars: 892 },
    ],
  },
};

function DeveloperPreview({ locale }: { locale: Locale }) {
  const c = DEVELOPER_CONTENT[locale];
  return (
    <div className="h-full overflow-y-auto bg-[#0f1117] text-white" style={{ fontFamily: "monospace" }}>
      <nav className="flex items-center justify-between px-8 py-5 border-b border-white/5">
        <span className="text-sm font-semibold text-[#c9a96e]">alex.dev</span>
        <div className="flex gap-6 text-xs text-white/30">
          {c.nav.map((n) => <span key={n}>{n}</span>)}
        </div>
      </nav>
      <div className="px-8 py-10">
        <p className="text-xs text-[#c9a96e]/60 mb-2">{c.role}</p>
        <h1 className="text-4xl font-bold mb-3 text-white">Alex Martin</h1>
        <p className="text-white/40 text-sm leading-relaxed max-w-md mb-8">
          {c.bio}
        </p>
        <div className="flex flex-wrap gap-2 mb-10">
          {["TypeScript","React","Node.js","PostgreSQL","Docker"].map((t) => (
            <span key={t} className="rounded-md border border-white/8 px-2.5 py-1 text-xs text-white/40">{t}</span>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          {c.projects.map((p) => (
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

const ARTIST_CONTENT = {
  fr: { category: "Peinture · Illustration · Paris", heading: "Œuvres récentes", bio: "Mon travail explore la tension entre l'organique et le géométrique. Expositions à Paris, Berlin et Tokyo." },
  en: { category: "Painting · Illustration · Paris", heading: "Recent works", bio: "My work explores the tension between the organic and the geometric. Exhibitions in Paris, Berlin and Tokyo." },
  es: { category: "Pintura · Ilustración · París", heading: "Obras recientes", bio: "Mi trabajo explora la tensión entre lo orgánico y lo geométrico. Exposiciones en París, Berlín y Tokio." },
};

function ArtistPreview({ locale }: { locale: Locale }) {
  const c = ARTIST_CONTENT[locale];
  return (
    <div className="h-full overflow-y-auto bg-[#f5f3ef] text-[#1c1917]" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
      <nav className="flex items-center justify-between px-8 py-5 border-b border-black/6">
        <span className="text-sm tracking-[0.2em] uppercase text-[#78716c]" style={{ fontFamily: "Inter, sans-serif" }}>Sophie Noir</span>
        <div className="flex gap-8 text-xs tracking-[0.15em] uppercase text-[#a09a94]" style={{ fontFamily: "Inter, sans-serif" }}>
          <span>Works</span><span>Studio</span><span>Contact</span>
        </div>
      </nav>
      <div className="px-8 pt-6 pb-4">
        <p className="text-xs tracking-widest uppercase text-[#a09a94] mb-1" style={{ fontFamily: "Inter, sans-serif" }}>{c.category}</p>
        <h1 className="text-3xl font-light text-[#44403c] mb-6">{c.heading}</h1>
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
          {c.bio}
        </p>
      </div>
    </div>
  );
}

// Terminologie déjà universelle en anglais dans les 3 langues (mode/luxe) —
// FashionPreview n'a donc pas besoin de traduction par locale.
function FashionPreview({ locale: _locale }: { locale: Locale }) {
  const c = { role: "Model · Creative Director", book: "Book →", contact: "Contact" };
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
        <p className="mb-2 text-xs tracking-[0.3em] uppercase text-[#c9a96e]/50" style={{ fontFamily: "Inter, sans-serif" }}>{c.role}</p>
        <h1 className="text-5xl font-light leading-[1.1] tracking-tight mb-1">Nina</h1>
        <h1 className="text-5xl font-light leading-[1.1] tracking-tight text-white/50 mb-5">Beaumont</h1>
        <p className="mb-7 max-w-[220px] text-sm text-white/35 leading-relaxed" style={{ fontFamily: "Inter, sans-serif" }}>
          Paris · Milan · New York<br />
          <span className="text-white/20 text-xs">Saint Laurent · Jacquemus · A.P.C.</span>
        </p>
        <div className="flex gap-3">
          <button className="rounded-full border border-white/12 px-5 py-2 text-xs tracking-widest uppercase text-white/40 hover:border-white/25 transition-colors" style={{ fontFamily: "Inter, sans-serif" }}>
            {c.book}
          </button>
          <button className="rounded-full border border-[#c9a96e]/20 bg-[#c9a96e]/8 px-5 py-2 text-xs tracking-widest uppercase text-[#c9a96e]/50" style={{ fontFamily: "Inter, sans-serif" }}>
            {c.contact}
          </button>
        </div>
      </div>
    </div>
  );
}

const MUSICIAN_CONTENT = {
  fr: {
    nav: ["Discographie", "Scène", "Contact"],
    role: "Rappeur",
    bio: "Rap authentique, textes qui touchent. Un univers en construction — et ça monte vite.",
    stats: [{ v: "1,3k", l: "Abonnés" }, { v: "14", l: "Titres" }, { v: "8,4k", l: "Vues" }],
    tracks: [
      { name: "Marty Bird",   tag: "Clip officiel" },
      { name: "Hermès",       tag: "Single" },
      { name: "Tunnel",       tag: "Freestyle" },
      { name: "Nuit blanche", tag: "Feat." },
    ],
  },
  en: {
    nav: ["Discography", "Live", "Contact"],
    role: "Rapper",
    bio: "Authentic rap, lyrics that hit home. A world still being built — and it's rising fast.",
    stats: [{ v: "1.3k", l: "Followers" }, { v: "14", l: "Tracks" }, { v: "8.4k", l: "Views" }],
    tracks: [
      { name: "Marty Bird",   tag: "Official video" },
      { name: "Hermès",       tag: "Single" },
      { name: "Tunnel",       tag: "Freestyle" },
      { name: "Nuit blanche", tag: "Feat." },
    ],
  },
  es: {
    nav: ["Discografía", "Directo", "Contacto"],
    role: "Rapero",
    bio: "Rap auténtico, letras que llegan. Un universo aún en construcción — y que crece rápido.",
    stats: [{ v: "1,3k", l: "Seguidores" }, { v: "14", l: "Temas" }, { v: "8,4k", l: "Visitas" }],
    tracks: [
      { name: "Marty Bird",   tag: "Vídeo oficial" },
      { name: "Hermès",       tag: "Single" },
      { name: "Tunnel",       tag: "Freestyle" },
      { name: "Nuit blanche", tag: "Feat." },
    ],
  },
};

function MusicianPreview({ locale }: { locale: Locale }) {
  const c = MUSICIAN_CONTENT[locale];
  return (
    <div className="h-full overflow-y-auto bg-[#0a0a0f] text-white" style={{ fontFamily: "Inter, sans-serif" }}>
      <nav className="flex items-center justify-between px-8 py-5 border-b border-white/5">
        <span className="text-sm font-semibold tracking-wide" style={{ fontFamily: "'Playfair Display', Georgia, serif", color: "#e879f9" }}>SOLKA</span>
        <div className="flex gap-6 text-xs text-white/25">
          {c.nav.map((n) => <span key={n}>{n}</span>)}
        </div>
      </nav>
      <div className="px-8 py-10">
        <p className="text-xs mb-2" style={{ color: "rgba(232,121,249,0.6)" }}>{c.role}</p>
        <h1 className="text-4xl font-bold mb-3 text-white">SOLKA</h1>
        <p className="text-white/40 text-sm leading-relaxed max-w-md mb-8">
          {c.bio}
        </p>
        <div className="grid grid-cols-3 gap-3 mb-8">
          {c.stats.map((s) => (
            <div key={s.l} className="rounded-xl border border-white/6 bg-white/2 p-4 text-center">
              <p className="text-xl font-bold" style={{ color: "#e879f9" }}>{s.v}</p>
              <p className="text-white/30 text-xs mt-1">{s.l}</p>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          {c.tracks.map((t) => (
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
