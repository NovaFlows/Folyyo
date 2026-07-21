"use client";

import { useState } from "react";
import type { SupportMessage } from "@/lib/db/queries";

const CATEGORY_LABEL: Record<string, string> = {
  bug: "🔧 Problème",
  suggestion: "💬 Suggestion",
  other: "❓ Autre",
};

export default function AdminSupportList({ messages }: { messages: SupportMessage[] }) {
  const [rows, setRows] = useState(messages);
  const [pending, setPending] = useState<string | null>(null);

  async function toggle(id: string, next: "new" | "resolved") {
    setPending(id);
    const prev = rows;
    setRows((r) => r.map((m) => (m.id === id ? { ...m, status: next } : m)));
    try {
      const res = await fetch(`/api/admin/support/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setRows(prev); // rollback
    } finally {
      setPending(null);
    }
  }

  if (rows.length === 0) {
    return <p className="text-sm" style={{ color: "#78716c" }}>Aucun message pour l&apos;instant.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {rows.map((m) => {
        const resolved = m.status === "resolved";
        return (
          <div key={m.id} className="rounded-2xl p-4"
            style={{ background: resolved ? "rgba(0,0,0,0.02)" : "#f0ece6", border: "1px solid rgba(0,0,0,0.06)", opacity: resolved ? 0.6 : 1 }}>
            <div className="flex items-start justify-between gap-4 mb-2">
              <div className="flex items-center gap-3 min-w-0">
                <span className="mono rounded px-1.5 py-0.5 text-xs shrink-0"
                  style={{ background: "rgba(0,0,0,0.04)", color: "#a09a94" }}>
                  {CATEGORY_LABEL[m.category] ?? m.category}
                </span>
                <span className="text-xs truncate" style={{ color: "#a09a94" }}>{m.email}</span>
                <span className="mono text-xs shrink-0" style={{ color: "#c8c4bf" }}>
                  {new Date(m.created_at).toLocaleString("fr-FR")}
                </span>
              </div>
              <button onClick={() => toggle(m.id, resolved ? "new" : "resolved")} disabled={pending === m.id}
                className="rounded-full px-3 py-1 text-xs font-medium shrink-0 transition hover:opacity-80 disabled:opacity-50"
                style={{
                  background: resolved ? "transparent" : "#1c1917",
                  color: resolved ? "#78716c" : "white",
                  border: `1px solid ${resolved ? "rgba(0,0,0,0.12)" : "#1c1917"}`,
                }}>
                {pending === m.id ? "…" : resolved ? "↺ Rouvrir" : "✓ Résolu"}
              </button>
            </div>
            <p className="text-sm whitespace-pre-wrap" style={{ color: "#1c1917" }}>{m.message}</p>
          </div>
        );
      })}
    </div>
  );
}
