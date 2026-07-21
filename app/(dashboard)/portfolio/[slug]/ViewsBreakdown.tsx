"use client";

import { useState } from "react";
import type { ViewSourceCount } from "@/lib/db/queries";

export default function ViewsBreakdown({ sources, label }: { sources: ViewSourceCount[]; label: string }) {
  const [open, setOpen] = useState(false);
  const total = sources.reduce((sum, s) => sum + s.count, 0);
  if (total === 0) return null;

  return (
    <div className="flex flex-col gap-1.5">
      <button onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 text-left transition hover:opacity-70"
        style={{ color: "#c9a96e" }}>
        <span className="text-xs">{label}</span>
        <span className="text-xs" style={{ transform: open ? "rotate(90deg)" : undefined, transition: "transform 0.15s" }}>›</span>
      </button>
      {open && (
        <div className="flex flex-col gap-1.5 pt-1">
          {sources.map((s) => (
            <div key={s.source} className="flex items-center gap-2 text-xs">
              <span className="w-28 shrink-0 truncate" style={{ color: "#78716c" }}>{s.label}</span>
              <div className="h-1.5 flex-1 rounded-full overflow-hidden" style={{ background: "rgba(0,0,0,0.06)" }}>
                <div className="h-full rounded-full" style={{ width: `${(s.count / total) * 100}%`, background: "#c9a96e" }} />
              </div>
              <span className="w-6 shrink-0 text-right" style={{ color: "#1c1917" }}>{s.count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
