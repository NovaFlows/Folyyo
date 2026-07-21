"use client";

import { useState } from "react";
import type { Dictionary } from "@/lib/i18n/dictionaries/fr";

const cardStyle = { background: "#f0ece6", border: "1px solid rgba(0,0,0,0.06)" };
const btnStyle: React.CSSProperties = { borderRadius: "0.75rem", padding: "0.65rem 1.25rem", fontSize: "0.8125rem", fontWeight: 600, color: "white", background: "#1c1917", border: "none", cursor: "pointer" };

type Category = "bug" | "suggestion" | "other";
type Status = "idle" | "submitting" | "success" | "error";

// `t` = juste la tranche `support` du dictionnaire (que des strings, jamais
// de fonction) — sûr à passer d'un Server Component (page.tsx) à ce Client
// Component, contrairement à un slice contenant des fonctions.
export default function SupportForm({ t }: { t: Dictionary["support"] }) {
  const [category, setCategory] = useState<Category>("bug");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  const categories: { value: Category; label: string }[] = [
    { value: "bug", label: t.categoryBug },
    { value: "suggestion", label: t.categorySuggestion },
    { value: "other", label: t.categoryOther },
  ];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) { setError(t.emptyError); return; }
    setStatus("submitting"); setError(null);
    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, message: message.trim() }),
      });
      if (!res.ok) throw new Error();
      setStatus("success");
    } catch {
      setError(t.error);
      setStatus("error");
    }
  }

  function reset() {
    setStatus("idle"); setMessage(""); setCategory("bug"); setError(null);
  }

  return (
    <div className="rounded-2xl p-6" style={cardStyle}>
      {status === "success" ? (
        <div className="text-center py-4">
          <p className="text-sm font-medium mb-4" style={{ color: "#1c1917" }}>{t.success}</p>
          <button onClick={reset} className="text-sm underline" style={{ color: "#a09a94" }}>{t.sendAnother}</button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm mb-2" style={{ color: "#78716c" }}>{t.categoryLabel}</label>
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <button key={c.value} type="button" onClick={() => setCategory(c.value)}
                  className="rounded-full px-4 py-2 text-sm font-medium transition"
                  style={{
                    background: category === c.value ? "#1c1917" : "white",
                    color: category === c.value ? "white" : "#78716c",
                    border: `1px solid ${category === c.value ? "#1c1917" : "rgba(0,0,0,0.1)"}`,
                  }}>
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm mb-2" style={{ color: "#78716c" }}>{t.messageLabel}</label>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={6}
              placeholder={t.messagePlaceholder}
              className="w-full rounded-xl p-3 text-sm outline-none"
              style={{ background: "white", border: "1px solid rgba(0,0,0,0.1)", color: "#1c1917", resize: "vertical" }} />
          </div>

          {error && <p className="text-sm" style={{ color: "#dc2626" }}>{error}</p>}

          <button type="submit" disabled={status === "submitting"} style={{ ...btnStyle, opacity: status === "submitting" ? 0.6 : 1, alignSelf: "flex-start" }}>
            {status === "submitting" ? t.submitting : t.submit}
          </button>
        </form>
      )}
    </div>
  );
}
