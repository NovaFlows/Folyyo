"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { getDictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/locale";
import type { SubscriptionStatus } from "@/types";

const cardStyle = { background: "#f0ece6", border: "1px solid rgba(0,0,0,0.06)" };
const btnStyle: React.CSSProperties = { borderRadius: "0.75rem", padding: "0.7rem 1.25rem", fontSize: "0.8125rem", fontWeight: 600, cursor: "pointer" };

export default function BillingPageClient({ locale, subscriptionStatus, trialEndsAt, currentPeriodEnd, hasStripeCustomer }: {
  locale: Locale;
  subscriptionStatus: SubscriptionStatus;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  hasStripeCustomer: boolean;
}) {
  const t = getDictionary(locale).billing;
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState<"monthly" | "yearly" | "portal" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const dateFmt = locale === "en" ? "en-US" : locale === "es" ? "es-ES" : "fr-FR";

  const statusLabel = (() => {
    if (subscriptionStatus === "lifetime") return t.statusLifetime;
    if (subscriptionStatus === "active") {
      return currentPeriodEnd ? t.statusActive(new Date(currentPeriodEnd).toLocaleDateString(dateFmt)) : t.statusLifetime;
    }
    if (subscriptionStatus === "canceled") return t.statusCanceled;
    if (subscriptionStatus === "past_due") return t.statusPastDue;
    // trialing
    if (!trialEndsAt) return t.statusExpired;
    const daysLeft = Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (daysLeft <= 0) return t.statusExpired;
    if (daysLeft === 1) return t.statusTrialingLastDay;
    return t.statusTrialing(daysLeft);
  })();

  const canSubscribe = subscriptionStatus !== "active" && subscriptionStatus !== "lifetime";

  async function startCheckout(plan: "monthly" | "yearly") {
    setLoading(plan); setError(null);
    try {
      const res = await fetch("/api/billing/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan }) });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error();
      window.location.href = data.url;
    } catch {
      setError(t.genericError); setLoading(null);
    }
  }

  async function openPortal() {
    setLoading("portal"); setError(null);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error();
      window.location.href = data.url;
    } catch {
      setError(t.genericError); setLoading(null);
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <p className="mono text-xs tracking-widest uppercase mb-2" style={{ color: "#a09a94", letterSpacing: "0.12em" }}>{t.kicker}</p>
        <h1 className="text-2xl serif" style={{ fontWeight: 500, color: "#1c1917" }}>{t.title}</h1>
        <p className="mt-2 text-sm" style={{ color: "#78716c" }}>{t.subtitle}</p>
      </div>

      {searchParams.get("success") === "1" && (
        <div className="mb-4 rounded-xl p-3 text-sm" style={{ background: "rgba(34,160,107,0.1)", color: "#22a06b" }}>{t.successNotice}</div>
      )}
      {searchParams.get("canceled") === "1" && (
        <div className="mb-4 rounded-xl p-3 text-sm" style={{ background: "rgba(0,0,0,0.04)", color: "#78716c" }}>{t.canceledNotice}</div>
      )}

      <div className="rounded-2xl p-6" style={cardStyle}>
        <p className="text-sm font-semibold mb-5" style={{ color: "#1c1917" }}>{statusLabel}</p>

        <div className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-wide mb-2.5" style={{ color: "#a09a94", letterSpacing: "0.08em" }}>{t.featuresTitle}</p>
          <ul className="flex flex-col gap-1.5">
            {t.features.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm" style={{ color: "#44403c" }}>
                <span style={{ color: "#c9a96e", flexShrink: 0 }}>✓</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>

        {canSubscribe && (
          <>
            <div className="flex flex-col gap-3 sm:flex-row">
              <button onClick={() => startCheckout("monthly")} disabled={loading !== null}
                style={{ ...btnStyle, background: "#1c1917", color: "white", border: "none", opacity: loading ? 0.6 : 1 }}>
                {loading === "monthly" ? t.redirecting : t.planMonthly}
              </button>
              <button onClick={() => startCheckout("yearly")} disabled={loading !== null}
                style={{ ...btnStyle, background: "white", color: "#1c1917", border: "1px solid rgba(0,0,0,0.12)", opacity: loading ? 0.6 : 1 }}>
                {loading === "yearly" ? t.redirecting : t.planYearly}
              </button>
            </div>
            <p className="mt-2.5 text-xs" style={{ color: "#a09a94" }}>{t.plansNote}</p>
          </>
        )}

        {hasStripeCustomer && (
          <button onClick={openPortal} disabled={loading !== null}
            className="mt-3"
            style={{ ...btnStyle, background: "transparent", color: "#78716c", border: "1px solid rgba(0,0,0,0.12)", opacity: loading ? 0.6 : 1 }}>
            {loading === "portal" ? t.redirecting : t.manageButton}
          </button>
        )}

        {error && <p className="mt-3 text-xs" style={{ color: "#dc2626" }}>{error}</p>}
      </div>
    </div>
  );
}
