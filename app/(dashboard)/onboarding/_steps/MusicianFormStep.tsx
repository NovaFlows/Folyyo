"use client";

import { useEffect, useState } from "react";
import type { OnboardingData } from "../page";

interface Props {
  data: OnboardingData;
  onChange: (partial: Partial<OnboardingData>) => void;
  onBack: () => void;
  onSubmit: () => void;
}

function normalizeYouTubeHandle(raw: string): string {
  raw = raw.trim();
  // Full URL: https://youtube.com/@handle or https://www.youtube.com/channel/...
  try {
    const url = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts[0]?.startsWith("@")) return parts[0].slice(1);
    if (parts[0] === "channel") return parts[1] ?? raw;
    if (parts[0]) return parts[0].replace(/^@/, "");
  } catch { /* not a URL */ }
  return raw.replace(/^@/, "").replace(/\s/g, "");
}

export default function MusicianFormStep({ data, onChange, onBack, onSubmit }: Props) {
  const [slugStatus, setSlugStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const [youtubeRaw, setYoutubeRaw] = useState(data.youtubeHandle ? `@${data.youtubeHandle}` : "");

  useEffect(() => {
    if (!data.slug || data.slug.length < 3) { setSlugStatus("idle"); return; }
    setSlugStatus("checking");
    const timer = setTimeout(async () => {
      const res = await fetch(`/api/portfolio/check-slug?slug=${encodeURIComponent(data.slug)}`);
      const { available } = await res.json();
      setSlugStatus(available ? "available" : "taken");
    }, 500);
    return () => clearTimeout(timer);
  }, [data.slug]);

  function handleYouTubeChange(raw: string) {
    setYoutubeRaw(raw);
    const handle = normalizeYouTubeHandle(raw);
    onChange({ youtubeHandle: handle });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (slugStatus === "taken") { alert("Ce slug est déjà pris, choisis-en un autre."); return; }
    if (!data.slug) { alert("Choisis une URL pour ton portfolio."); return; }
    onSubmit();
  }

  return (
    <div>
      <button onClick={onBack}
        className="mb-6 flex items-center gap-2 text-sm transition hover:opacity-60"
        style={{ color: "#a09a94" }}>
        ← Retour
      </button>

      <div className="mb-8">
        <p className="mono text-xs tracking-widest uppercase mb-3" style={{ color: "#a09a94", letterSpacing: "0.12em" }}>02 / profil</p>
        <h1 className="mb-2 text-3xl serif" style={{ fontWeight: 500, color: "#1c1917" }}>
          Ton profil musical
        </h1>
        <p className="text-sm" style={{ color: "#78716c" }}>
          On récupère tes vraies vidéos YouTube pour remplir ta discographie automatiquement.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Prénom / Nom *" value={data.name} onChange={(v) => onChange({ name: v })} placeholder="Lacrim, PLK…" required />
          <Field label="Titre / Genre *" value={data.title} onChange={(v) => onChange({ title: v })} placeholder="Rappeur, Chanteur, Youtubeur…" required />
        </div>

        <Field label="Email de contact *" type="email" value={data.email} onChange={(v) => onChange({ email: v })} placeholder="contact@exemple.com" required />

        {/* YouTube */}
        <div>
          <label className="mb-1.5 block text-sm font-medium" style={{ color: "#78716c" }}>
            Chaîne YouTube
            <span className="ml-2 text-xs font-normal" style={{ color: "#c9a96e" }}>→ on récupère tes sons automatiquement</span>
          </label>
          <div className="flex items-center rounded-xl transition"
            style={{ background: "white", border: "1px solid rgba(0,0,0,0.1)" }}>
            <span className="pl-4 text-sm shrink-0" style={{ color: "#a09a94" }}>youtube.com/</span>
            <input
              type="text"
              value={youtubeRaw}
              onChange={(e) => handleYouTubeChange(e.target.value)}
              placeholder="@monartiste ou URL complète"
              className="w-full bg-transparent px-3 py-3 text-sm outline-none"
              style={{ color: "#1c1917" }}
            />
          </div>
          <p className="mt-1 text-xs" style={{ color: "#a09a94" }}>
            Ex : @lacrim_force1 · youtube.com/@monartiste · URL complète
          </p>
        </div>

        {/* Instagram */}
        <div>
          <label className="mb-1.5 block text-sm font-medium" style={{ color: "#78716c" }}>Instagram (optionnel)</label>
          <div className="flex items-center rounded-xl transition"
            style={{ background: "white", border: "1px solid rgba(0,0,0,0.1)" }}>
            <span className="pl-4 text-sm shrink-0" style={{ color: "#a09a94" }}>instagram.com/</span>
            <input type="text" value={data.instagramHandle}
              onChange={(e) => onChange({ instagramHandle: e.target.value.replace(/^@/, "").replace(/\s/g, "") })}
              placeholder="monartiste"
              className="w-full bg-transparent px-3 py-3 text-sm outline-none"
              style={{ color: "#1c1917" }} />
          </div>
        </div>

        <Field label="LinkedIn / Site web (optionnel)" value={data.linkedinUrl} onChange={(v) => onChange({ linkedinUrl: v })} placeholder="https://monsite.com" />

        {/* Slug */}
        <div>
          <label className="mb-1.5 block text-sm font-medium" style={{ color: "#78716c" }}>URL de ton portfolio *</label>
          <div className="flex items-center rounded-xl transition"
            style={{
              background: "white",
              border: `1px solid ${slugStatus === "taken" ? "#dc2626" : slugStatus === "available" ? "#c9a96e" : "rgba(0,0,0,0.1)"}`,
            }}>
            <span className="mono pl-4 text-xs shrink-0" style={{ color: "#a09a94" }}>folyyo.com/</span>
            <input type="text" value={data.slug}
              onChange={(e) => onChange({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 30) })}
              required placeholder="mon-artiste"
              className="mono w-full bg-transparent px-2 py-3 text-sm outline-none"
              style={{ color: "#1c1917" }} />
            <span className="mono pr-3 text-xs shrink-0">
              {slugStatus === "checking"  && <span style={{ color: "#a09a94" }}>…</span>}
              {slugStatus === "available" && <span style={{ color: "#c9a96e" }}>✓</span>}
              {slugStatus === "taken"     && <span style={{ color: "#dc2626" }}>✗</span>}
            </span>
          </div>
          <p className="mono mt-1 text-xs" style={{ color: "#a09a94" }}>lettres minuscules, chiffres, tirets · max 30 chars</p>
        </div>

        <button type="submit"
          disabled={slugStatus === "taken" || slugStatus === "checking" || !data.slug}
          className="w-full rounded-xl py-3.5 text-sm font-semibold text-white transition hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: "#1c1917" }}>
          {slugStatus === "checking" ? "Vérification…" : "Générer mon portfolio →"}
        </button>
      </form>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = "text", required }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; required?: boolean;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm" style={{ color: "#78716c" }}>{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder} required={required}
        className="w-full rounded-xl px-4 py-3 text-sm outline-none transition"
        style={{ background: "white", border: "1px solid rgba(0,0,0,0.1)", color: "#1c1917" }} />
    </div>
  );
}
