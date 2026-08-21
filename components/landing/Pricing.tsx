import Link from "next/link";
import { Check } from "lucide-react";
import { getDictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/types";

// Section tarifs de la landing.
//
// Deux partis pris :
//
//  1. La liste des fonctionnalités vient de `billing.features`, celle-là même
//     qu'affiche la page d'abonnement. Recopier ces cinq lignes ici aurait
//     garanti qu'un jour la landing promette autre chose que ce que la page de
//     paiement livre.
//  2. Les deux formules donnent accès EXACTEMENT à la même chose — c'est écrit
//     noir sur blanc dans le produit. On n'affiche donc pas deux colonnes de
//     fonctionnalités identiques (le réflexe habituel des grilles tarifaires) :
//     deux encadrés de prix, puis UNE seule liste commune. Dupliquer aurait
//     laissé croire à une formule au rabais.
//
// Le bouton mène à l'inscription, pas au paiement : l'essai de 3 jours ne
// demande pas de carte, et l'abonnement se choisit plus tard depuis le compte.
export default function Pricing({ locale }: { locale: Locale }) {
  const d = getDictionary(locale);
  const t = d.pricing;
  const features = d.billing.features;

  return (
    <section id="tarifs" className="ld-reveal px-6 py-24" style={{ background: "#f0ece6" }}>
      <div className="mx-auto max-w-4xl">
        <div className="mb-12 text-center">
          <p className="text-sm tracking-widest uppercase mb-3" style={{ color: "#a09a94" }}>{t.kicker}</p>
          <h2 className="mb-4 text-4xl" style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 500, color: "#1c1917" }}>
            {t.titlePre}<em className="font-normal" style={{ color: "#c9a96e" }}>{t.titleEm}</em>
          </h2>
          <p className="mx-auto max-w-xl text-base leading-relaxed" style={{ color: "#78716c" }}>
            {t.subtitle}
          </p>
        </div>

        {/* Les deux fréquences de facturation */}
        <div className="grid gap-5 sm:grid-cols-2">
          <PlanBox
            label={t.monthlyLabel} price={t.monthlyPrice} per={t.monthlyPer} note={t.monthlyNote}
          />
          <PlanBox
            label={t.yearlyLabel} price={t.yearlyPrice} per={t.yearlyPer} note={t.yearlyNote}
            badge={t.save} highlight
          />
        </div>

        {/* Une seule liste : les deux formules sont identiques */}
        <div className="mt-6 rounded-2xl p-8" style={{ background: "#f8f5f0", border: "1px solid rgba(0,0,0,0.06)" }}>
          <p className="mb-5 text-sm tracking-widest uppercase" style={{ color: "#a09a94" }}>{t.includedTitle}</p>
          <ul className="grid gap-3.5 sm:grid-cols-2">
            {features.map((f) => (
              <li key={f} className="flex items-start gap-3">
                <span
                  className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                  style={{ background: "rgba(201,169,110,0.16)" }}
                >
                  <Check size={12} strokeWidth={2.5} color="#c9a96e" />
                </span>
                <span className="text-sm leading-relaxed" style={{ color: "#57534e" }}>{f}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-10 text-center">
          <Link
            href="/signup"
            className="inline-flex items-center gap-3 rounded-2xl px-9 py-4 text-base font-medium transition hover:opacity-90 hover:-translate-y-0.5"
            style={{ background: "#1c1917", color: "#f8f5f0" }}
          >
            {t.cta}
          </Link>
          <p className="mt-4 text-sm" style={{ color: "#a09a94" }}>{t.footnote}</p>
        </div>
      </div>
    </section>
  );
}

function PlanBox({ label, price, per, note, badge, highlight }: {
  label: string; price: string; per: string; note: string; badge?: string; highlight?: boolean;
}) {
  return (
    <div
      className="relative rounded-2xl p-7"
      style={{
        background: "#f8f5f0",
        border: `1px solid ${highlight ? "rgba(201,169,110,0.5)" : "rgba(0,0,0,0.06)"}`,
        boxShadow: highlight ? "0 18px 44px -26px rgba(201,169,110,0.7)" : "none",
      }}
    >
      {badge && (
        <span
          className="absolute right-6 top-6 rounded-full px-3 py-1 text-xs font-medium"
          style={{ background: "rgba(201,169,110,0.16)", color: "#9a7f4e" }}
        >
          {badge}
        </span>
      )}
      <p className="text-sm" style={{ color: "#78716c" }}>{label}</p>
      <p className="mt-3 flex items-baseline gap-1.5">
        <span style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "2.75rem", fontWeight: 500, color: "#1c1917", lineHeight: 1 }}>
          {price}
        </span>
        <span className="text-base" style={{ color: "#a09a94" }}>{per}</span>
      </p>
      <p className="mt-3 text-sm" style={{ color: "#a09a94" }}>{note}</p>
    </div>
  );
}
