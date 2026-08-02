import { Star } from "lucide-react";
import type { Review } from "@/lib/db/queries";

// Liste en lecture seule (aucune action à effectuer sur un avis, contrairement
// aux messages de support) — pas de "use client" nécessaire, se rend
// entièrement côté serveur comme le reste de la page admin/reviews.
export default function AdminReviewsList({ reviews }: { reviews: Review[] }) {
  if (reviews.length === 0) {
    return <p className="text-sm" style={{ color: "#78716c" }}>Aucun avis pour l&apos;instant.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {reviews.map((r) => (
        <div key={r.id} className="rounded-2xl p-4"
          style={{ background: "#f0ece6", border: "1px solid rgba(0,0,0,0.06)" }}>
          <div className="flex items-start justify-between gap-4 mb-2">
            <div className="flex items-center gap-3 min-w-0">
              <span className="flex items-center gap-0.5 shrink-0">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star key={n} size={14} strokeWidth={1.5} color="#c9a96e" fill={n <= r.rating ? "#c9a96e" : "none"} />
                ))}
              </span>
              <span className="text-xs truncate" style={{ color: "#a09a94" }}>{r.email}</span>
            </div>
            <span className="mono text-xs shrink-0" style={{ color: "#c8c4bf" }}>
              {new Date(r.created_at).toLocaleString("fr-FR")}
            </span>
          </div>
          {r.comment && (
            <p className="text-sm whitespace-pre-wrap" style={{ color: "#1c1917" }}>{r.comment}</p>
          )}
        </div>
      ))}
    </div>
  );
}
