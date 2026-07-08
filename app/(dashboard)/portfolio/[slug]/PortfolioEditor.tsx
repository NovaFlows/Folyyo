"use client";

import { useState, useRef, useEffect } from "react";

interface Edit {
  id: string;
  instruction: string;
  status: string;
  created_at: string;
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

export default function PortfolioEditor({ portfolioId, hasCode, edits: initialEdits }: Props) {
  const [edits, setEdits]           = useState<Edit[]>(initialEdits);
  const [instruction, setInstruction] = useState("");
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<string | null>(null);
  const textareaRef  = useRef<HTMLTextAreaElement>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [edits]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!instruction.trim() || loading) return;
    const inst = instruction.trim();
    setInstruction(""); setLoading(true); setError(null); setLastResult(null);

    const tempEdit: Edit = { id: `temp-${Date.now()}`, instruction: inst, status: "pending", created_at: new Date().toISOString() };
    setEdits((prev) => [tempEdit, ...prev]);

    try {
      const res = await fetch("/api/portfolio/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ portfolioId, instruction: inst }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Erreur inconnue");
        setEdits((prev) => prev.map((e) => e.id === tempEdit.id ? { ...e, status: "failed" } : e));
        return;
      }
      setEdits((prev) => prev.map((e) => e.id === tempEdit.id ? { ...e, status: "applied" } : e));
      setLastResult(data.summary);
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
        <p className="text-xs mt-0.5" style={{ color: "#a09a94" }}>Décris la modification en langage naturel.</p>
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

      {/* Result / Error */}
      {lastResult && (
        <div className="mx-6 mb-2 rounded-xl px-4 py-2.5 text-sm"
          style={{ background: "rgba(201,169,110,0.1)", border: "1px solid rgba(201,169,110,0.2)", color: "#c9a96e" }}>
          ✓ {lastResult}
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

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex gap-3 px-4 py-3" style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}>
        <textarea ref={textareaRef} value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder='Ex : "change la couleur principale en rouge corail" — Entrée pour envoyer'
          rows={2} disabled={loading}
          className="flex-1 resize-none rounded-xl px-4 py-3 text-sm outline-none transition disabled:opacity-50"
          style={{ background: "white", border: "1px solid rgba(0,0,0,0.1)", color: "#1c1917" }} />
        <button type="submit" disabled={loading || !instruction.trim()}
          className="self-end rounded-xl px-5 py-3 text-sm font-semibold text-white transition hover:opacity-80 disabled:opacity-40"
          style={{ background: "#1c1917" }}>
          {loading ? "…" : "→"}
        </button>
      </form>
    </div>
  );
}
