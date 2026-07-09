"use client";

import { useRef, useState, useEffect } from "react";
import type { OnboardingData } from "../page";

interface Props {
  data: OnboardingData;
  onChange: (partial: Partial<OnboardingData>) => void;
  onBack: () => void;
  onSubmit: () => void;
}

export default function ArtistFormStep({ data, onChange, onBack, onSubmit }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [slugStatus, setSlugStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");

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

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file && file.type === "application/pdf") onChange({ cvFile: file });
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
          {data.profileType === "other" ? "Ton profil" : "Ton profil créatif"}
        </h1>
        <p className="text-sm" style={{ color: "#78716c" }}>Ces infos serviront à générer le contenu de ton portfolio.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* CV Upload */}
        <div>
          <label className="mb-1.5 block text-sm font-medium" style={{ color: "#78716c" }}>CV (PDF) — optionnel</label>
          <div onClick={() => fileInputRef.current?.click()}
            className="cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition"
            style={{
              borderColor: data.cvFile ? "#c9a96e" : "rgba(0,0,0,0.12)",
              background: data.cvFile ? "rgba(201,169,110,0.05)" : "#f0ece6",
            }}>
            {data.cvFile ? (
              <div>
                <p className="text-sm font-medium" style={{ color: "#c9a96e" }}>✓ {data.cvFile.name}</p>
                <p className="mt-1 text-xs" style={{ color: "#a09a94" }}>Cliquer pour changer</p>
              </div>
            ) : (
              <div>
                <p className="text-sm" style={{ color: "#78716c" }}>Clique pour uploader ton CV</p>
                <p className="mt-1 text-xs" style={{ color: "#a09a94" }}>PDF uniquement · max 10 MB · aide l'IA à mieux personnaliser</p>
              </div>
            )}
          </div>
          <input ref={fileInputRef} type="file" accept=".pdf" onChange={handleFileChange} className="hidden" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Prénom / Nom *" value={data.name} onChange={(v) => onChange({ name: v })} placeholder="Sophie Martin" required />
          <Field label="Titre / Spécialité *" value={data.title} onChange={(v) => onChange({ title: v })} placeholder="Photographe, Illustrateur, DJ…" required />
        </div>

        <Field label="Email de contact *" type="email" value={data.email} onChange={(v) => onChange({ email: v })} placeholder="sophie@exemple.com" required />

        {/* Instagram */}
        <div>
          <label className="mb-1.5 block text-sm font-medium" style={{ color: "#78716c" }}>Instagram (recommandé)</label>
          <div className="flex items-center rounded-xl transition"
            style={{ background: "white", border: "1px solid rgba(0,0,0,0.1)" }}>
            <span className="pl-4 text-sm shrink-0" style={{ color: "#a09a94" }}>instagram.com/</span>
            <input type="text" value={data.instagramHandle}
              onChange={(e) => onChange({ instagramHandle: e.target.value.replace(/^@/, "").replace(/\s/g, "") })}
              placeholder="sophiemartin"
              className="w-full bg-transparent px-3 py-3 text-sm outline-none"
              style={{ color: "#1c1917" }} />
          </div>
        </div>

        <Field label="LinkedIn (optionnel)" value={data.linkedinUrl} onChange={(v) => onChange({ linkedinUrl: v })} placeholder="linkedin.com/in/sophie" />

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
              required placeholder="sophie-martin"
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
