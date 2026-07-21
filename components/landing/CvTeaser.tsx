"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import type { Locale } from "@/lib/i18n/types";

interface TeaserResult {
  name: string;
  title: string;
  tagline: string;
  skills: string[];
}

type Status = "idle" | "dragging" | "analyzing" | "result" | "error";

const STRINGS = {
  fr: {
    pdfRequired: "Format PDF requis.",
    tooBig: "Fichier trop grand (max 10 MB).",
    analyzeError: "Analyse impossible, réessaie.",
    networkError: "Erreur réseau, réessaie.",
    dropHint: "Glisse ton CV ici, ou clique pour le choisir",
    dropSub: "PDF uniquement · max 10 MB · aucun compte requis",
    analyzing: "Analyse de ton CV…",
    detectedProfile: "Profil détecté",
    yourProfile: "Ton profil",
    ctaFull: "Créer mon compte pour voir le résultat complet →",
    tryAnother: "Essayer un autre CV",
  },
  en: {
    pdfRequired: "PDF format required.",
    tooBig: "File too large (max 10 MB).",
    analyzeError: "Couldn't analyze it, try again.",
    networkError: "Network error, try again.",
    dropHint: "Drop your resume here, or click to choose it",
    dropSub: "PDF only · max 10 MB · no account required",
    analyzing: "Analyzing your resume…",
    detectedProfile: "Detected profile",
    yourProfile: "Your profile",
    ctaFull: "Create my account to see the full result →",
    tryAnother: "Try another resume",
  },
  es: {
    pdfRequired: "Se requiere formato PDF.",
    tooBig: "Archivo demasiado grande (máx. 10 MB).",
    analyzeError: "No se pudo analizar, inténtalo de nuevo.",
    networkError: "Error de red, inténtalo de nuevo.",
    dropHint: "Arrastra tu CV aquí, o haz clic para elegirlo",
    dropSub: "Solo PDF · máx. 10 MB · sin necesidad de cuenta",
    analyzing: "Analizando tu CV…",
    detectedProfile: "Perfil detectado",
    yourProfile: "Tu perfil",
    ctaFull: "Crear mi cuenta para ver el resultado completo →",
    tryAnother: "Probar con otro CV",
  },
};

export default function CvTeaser({ locale }: { locale: Locale }) {
  const t = STRINGS[locale];
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<TeaserResult | null>(null);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function analyze(file: File) {
    if (file.type !== "application/pdf") {
      setError(t.pdfRequired);
      setStatus("error");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError(t.tooBig);
      setStatus("error");
      return;
    }
    setStatus("analyzing");
    try {
      const formData = new FormData();
      formData.append("cv", file);
      const res = await fetch("/api/teaser", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? t.analyzeError);
        setStatus("error");
        return;
      }
      setResult(data);
      setStatus("result");
    } catch {
      setError(t.networkError);
      setStatus("error");
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      {(status === "idle" || status === "dragging" || status === "error") && (
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setStatus("dragging"); }}
          onDragLeave={() => setStatus("idle")}
          onDrop={(e) => {
            e.preventDefault();
            setStatus("idle");
            const file = e.dataTransfer.files?.[0];
            if (file) analyze(file);
          }}
          className="cursor-pointer rounded-2xl border-2 border-dashed p-10 text-center transition"
          style={{
            borderColor: status === "dragging" ? "#c9a96e" : "rgba(0,0,0,0.12)",
            background: status === "dragging" ? "rgba(201,169,110,0.06)" : "#f0ece6",
          }}
        >
          <p className="mb-1 text-sm font-medium" style={{ color: "#1c1917" }}>
            {t.dropHint}
          </p>
          <p className="text-xs" style={{ color: "#a09a94" }}>{t.dropSub}</p>
          {status === "error" && (
            <p className="mt-3 text-xs font-medium" style={{ color: "#dc2626" }}>{error}</p>
          )}
          <input
            ref={inputRef} type="file" accept=".pdf" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) analyze(f); }}
          />
        </div>
      )}

      {status === "analyzing" && (
        <div className="rounded-2xl p-10 text-center" style={{ background: "#f0ece6", border: "1px solid rgba(0,0,0,0.06)" }}>
          <span className="inline-flex h-2.5 w-2.5 rounded-full animate-pulse" style={{ background: "#c9a96e" }} />
          <p className="mt-3 text-sm" style={{ color: "#78716c" }}>{t.analyzing}</p>
        </div>
      )}

      {status === "result" && result && (
        <div className="ld-chat-in rounded-2xl p-8" style={{ background: "#f0ece6", border: "1px solid rgba(0,0,0,0.06)" }}>
          <p className="text-xs font-medium mb-1" style={{ color: "#c9a96e" }}>{result.title || t.detectedProfile}</p>
          <h3 className="mb-2 text-2xl" style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 500, color: "#1c1917" }}>
            {result.name || t.yourProfile}
          </h3>
          <p className="mb-4 text-sm italic leading-relaxed" style={{ color: "#57534e" }}>&ldquo;{result.tagline}&rdquo;</p>
          {result.skills.length > 0 && (
            <div className="mb-6 flex flex-wrap gap-2">
              {result.skills.map((s) => (
                <span key={s} className="rounded-full px-3 py-1 text-xs font-medium" style={{ background: "rgba(201,169,110,0.12)", color: "#c9a96e" }}>
                  {s}
                </span>
              ))}
            </div>
          )}
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-medium text-white transition hover:opacity-90 hover:-translate-y-0.5"
            style={{ background: "#1c1917" }}
          >
            {t.ctaFull}
          </Link>
          <button
            onClick={() => { setStatus("idle"); setResult(null); }}
            className="ml-3 text-xs underline"
            style={{ color: "#a09a94" }}
          >
            {t.tryAnother}
          </button>
        </div>
      )}
    </div>
  );
}
