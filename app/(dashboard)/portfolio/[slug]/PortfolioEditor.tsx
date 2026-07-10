"use client";

import { useState, useRef, useEffect } from "react";

interface Edit {
  id: string;
  instruction: string;
  status: string;
  created_at: string;
}

interface ImagePreview {
  previewUrl: string;
  data: string;
  mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif";
}

interface DiffItem {
  label: string;
  oldValue: string;
  newValue: string;
  type: "color" | "text";
}

interface EditResult {
  summary: string;
  diff: DiffItem[];
}

interface Props {
  portfolioId: string;
  hasCode: boolean;
  edits: Edit[];
}

const SUGGESTIONS = [
  "Change la couleur principale en bleu marine",
  "Ajoute une animation fade-in sur le hero",
  "Agrandis les titres des sections",
  "Rends la typographie plus élégante",
  "Ajoute des icônes aux liens sociaux",
];

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;

function readImageAsBase64(file: File): Promise<ImagePreview> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      // dataUrl = "data:image/jpeg;base64,XXXX"
      const [prefix, data] = dataUrl.split(",");
      const mediaType = prefix.split(":")[1].split(";")[0] as ImagePreview["mediaType"];
      resolve({ previewUrl: dataUrl, data, mediaType });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function PortfolioEditor({ portfolioId, hasCode, edits: initialEdits }: Props) {
  const [edits, setEdits]             = useState<Edit[]>(initialEdits);
  const [instruction, setInstruction] = useState("");
  const [images, setImages]           = useState<ImagePreview[]>([]);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [lastResult, setLastResult]   = useState<EditResult | null>(null);
  const textareaRef   = useRef<HTMLTextAreaElement>(null);
  const fileInputRef  = useRef<HTMLInputElement>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [edits]);

  async function handleImageFiles(files: FileList | null) {
    if (!files) return;
    const valid = Array.from(files).filter((f) => ALLOWED_TYPES.includes(f.type as typeof ALLOWED_TYPES[number]));
    const previews = await Promise.all(valid.slice(0, 4).map(readImageAsBase64));
    setImages((prev) => [...prev, ...previews].slice(0, 4));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!instruction.trim() || loading) return;
    const inst = instruction.trim();
    const imgs = images;
    setInstruction(""); setImages([]); setLoading(true); setError(null); setLastResult(null);

    const tempEdit: Edit = { id: `temp-${Date.now()}`, instruction: inst, status: "pending", created_at: new Date().toISOString() };
    setEdits((prev) => [tempEdit, ...prev]);

    try {
      const res = await fetch("/api/portfolio/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          portfolioId,
          instruction: inst,
          images: imgs.length ? imgs.map(({ data, mediaType }) => ({ data, mediaType })) : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Erreur inconnue");
        setEdits((prev) => prev.map((e) => e.id === tempEdit.id ? { ...e, status: "failed" } : e));
        return;
      }
      setEdits((prev) => prev.map((e) => e.id === tempEdit.id ? { ...e, status: "applied" } : e));
      setLastResult({ summary: data.summary, diff: data.diff ?? [] });
    } catch {
      setError("Erreur réseau");
      setEdits((prev) => prev.map((e) => e.id === tempEdit.id ? { ...e, status: "failed" } : e));
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(e as unknown as React.FormEvent); }
  }

  if (!hasCode) {
    return (
      <div className="rounded-2xl p-8 text-center" style={{ background: "#f0ece6", border: "1px solid rgba(0,0,0,0.06)" }}>
        <p style={{ color: "#a09a94" }}>Le code n&apos;a pas encore été généré.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: "#f0ece6", border: "1px solid rgba(0,0,0,0.06)" }}>
      {/* Header */}
      <div className="px-6 py-4" style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
        <h2 className="text-sm font-semibold" style={{ color: "#1c1917" }}>Éditer par instruction</h2>
        <p className="text-xs mt-0.5" style={{ color: "#a09a94" }}>Décris la modification en langage naturel. Tu peux joindre des images de référence.</p>
      </div>

      {/* Chat history */}
      <div className="max-h-80 overflow-y-auto px-6 py-4 space-y-3">
        {edits.length === 0 && (
          <p className="text-center text-sm py-4" style={{ color: "#a09a94" }}>Aucune modification encore</p>
        )}
        {[...edits].reverse().map((edit) => (
          <div key={edit.id} className="flex gap-3">
            <div className="mt-1 h-6 w-6 shrink-0 rounded-full flex items-center justify-center text-xs font-medium"
              style={{
                background: edit.status === "applied" ? "rgba(201,169,110,0.15)" : edit.status === "failed" ? "rgba(220,38,38,0.08)" : "rgba(0,0,0,0.05)",
                color: edit.status === "applied" ? "#c9a96e" : edit.status === "failed" ? "#dc2626" : "#a09a94",
              }}>
              {edit.status === "applied" ? "✓" : edit.status === "failed" ? "×" : "·"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm leading-snug" style={{ color: "#1c1917" }}>{edit.instruction}</p>
              <p className="mt-0.5 text-xs" style={{
                color: edit.status === "applied" ? "#c9a96e" : edit.status === "failed" ? "#dc2626" : "#a09a94",
              }}>
                {edit.status === "applied" ? "Appliqué" : edit.status === "failed" ? "Échec" : "En cours…"}
              </p>
            </div>
          </div>
        ))}
        <div ref={chatBottomRef} />
      </div>

      {/* Result + Diff (#5) */}
      {lastResult && (
        <div className="mx-6 mb-2 rounded-xl overflow-hidden"
          style={{ border: "1px solid rgba(201,169,110,0.25)" }}>
          {/* Summary line */}
          <div className="px-4 py-2.5 text-sm font-medium"
            style={{ background: "rgba(201,169,110,0.12)", color: "#c9a96e" }}>
            ✓ {lastResult.summary}
          </div>
          {/* Diff items */}
          {lastResult.diff.length > 0 && (
            <div className="px-4 py-3 space-y-2" style={{ background: "rgba(201,169,110,0.04)" }}>
              {lastResult.diff.map((item, i) => (
                <div key={i} className="flex items-center gap-3 text-xs">
                  <span className="shrink-0 w-28 text-right" style={{ color: "#a09a94" }}>{item.label}</span>
                  {item.type === "color" ? (
                    <div className="flex items-center gap-2">
                      <span title={item.oldValue} style={{
                        display: "inline-block", width: 18, height: 18, borderRadius: 4,
                        background: item.oldValue, border: "1px solid rgba(0,0,0,0.15)", flexShrink: 0
                      }} />
                      <span style={{ color: "#a09a94" }}>→</span>
                      <span title={item.newValue} style={{
                        display: "inline-block", width: 18, height: 18, borderRadius: 4,
                        background: item.newValue, border: "1px solid rgba(0,0,0,0.15)", flexShrink: 0
                      }} />
                      <span style={{ color: "#78716c", fontFamily: "monospace" }}>{item.newValue}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 min-w-0">
                      {item.oldValue && (
                        <span className="truncate max-w-[90px]" style={{ color: "#a09a94", textDecoration: "line-through" }}>{item.oldValue}</span>
                      )}
                      {item.oldValue && <span style={{ color: "#a09a94" }}>→</span>}
                      <span className="truncate max-w-[120px]" style={{ color: "#1c1917", fontWeight: 500 }}>{item.newValue}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {error && (
        <div className="mx-6 mb-2 rounded-xl px-4 py-2.5 text-sm"
          style={{ background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.15)", color: "#dc2626" }}>
          {error}
        </div>
      )}

      {/* Suggestions */}
      <div className="px-6 pb-3 flex flex-wrap gap-2">
        {SUGGESTIONS.map((s) => (
          <button key={s} onClick={() => { setInstruction(s); textareaRef.current?.focus(); }}
            className="rounded-lg px-3 py-1.5 text-xs transition hover:opacity-70"
            style={{ border: "1px solid rgba(0,0,0,0.1)", color: "#78716c", background: "white" }}>
            {s}
          </button>
        ))}
      </div>

      {/* Image previews */}
      {images.length > 0 && (
        <div className="px-4 pb-2 flex gap-2 flex-wrap">
          {images.map((img, i) => (
            <div key={i} className="relative" style={{ width: 56, height: 56 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.previewUrl} alt="" style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 8, border: "1px solid rgba(0,0,0,0.1)" }} />
              <button
                onClick={() => setImages((prev) => prev.filter((_, j) => j !== i))}
                style={{ position: "absolute", top: -6, right: -6, width: 18, height: 18, borderRadius: "50%", background: "#dc2626", color: "white", border: "none", cursor: "pointer", fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex gap-2 px-4 py-3 items-end" style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}>
        {/* Image upload button */}
        <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple className="hidden"
          onChange={(e) => handleImageFiles(e.target.files)} />
        <button type="button" onClick={() => fileInputRef.current?.click()} disabled={loading || images.length >= 4}
          title="Joindre une image"
          className="shrink-0 rounded-xl flex items-center justify-center transition hover:opacity-70 disabled:opacity-30"
          style={{ width: 42, height: 42, background: "white", border: "1px solid rgba(0,0,0,0.1)", color: "#78716c", fontSize: "1.1rem" }}>
          🖼
        </button>

        <textarea ref={textareaRef} value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder='Ex : "change la couleur principale en rouge corail" — Entrée pour envoyer'
          rows={2} disabled={loading}
          className="flex-1 resize-none rounded-xl px-4 py-3 text-sm outline-none transition disabled:opacity-50"
          style={{ background: "white", border: "1px solid rgba(0,0,0,0.1)", color: "#1c1917" }} />

        <button type="submit" disabled={loading || !instruction.trim()}
          className="shrink-0 rounded-xl text-sm font-semibold text-white transition hover:opacity-80 disabled:opacity-40"
          style={{ background: "#1c1917", width: 42, height: 42, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem" }}>
          {loading ? "…" : "→"}
        </button>
      </form>
    </div>
  );
}
