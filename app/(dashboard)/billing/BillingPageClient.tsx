"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getDictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/locale";
import type { SubscriptionStatus } from "@/types";

const cardStyle = { background: "#f0ece6", border: "1px solid rgba(0,0,0,0.06)" };
const btnStyle: React.CSSProperties = { borderRadius: "0.75rem", padding: "0.7rem 1.25rem", fontSize: "0.8125rem", fontWeight: 600, cursor: "pointer" };

const MONTHLY_PRICE = 5.99;
const YEARLY_PRICE = 49.99;

export default function BillingPageClient({ locale, subscriptionStatus, trialEndsAt, currentPeriodEnd, hasStripeCustomer }: {
  locale: Locale;
  subscriptionStatus: SubscriptionStatus;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  hasStripeCustomer: boolean;
}) {
  const t = getDictionary(locale).billing;
  const searchParams = useSearchParams();
  const [cycle, setCycle] = useState<"monthly" | "yearly">("yearly");
  const [loading, setLoading] = useState<"checkout" | "portal" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const numberFmt = locale === "en" ? "en-US" : locale === "es" ? "es-ES" : "fr-FR";
  const dateFmt = numberFmt;
  const money = (n: number) => n.toLocaleString(numberFmt, { style: "currency", currency: "EUR" });

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
  const monthlyEquivalent = cycle === "yearly" ? YEARLY_PRICE / 12 : MONTHLY_PRICE;

  // Plan explicite en paramètre (pas lu depuis `cycle`) : l'auto-déclenchement
  // ci-dessous appelle ça juste après un setCycle, dont l'effet ne serait pas
  // encore visible dans ce même rendu (mise à jour d'état asynchrone) — lire
  // `cycle` ici renverrait alors la formule précédente.
  async function runCheckout(plan: "monthly" | "yearly") {
    setLoading("checkout"); setError(null);
    try {
      const res = await fetch("/api/billing/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan }) });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error();
      window.location.href = data.url;
    } catch {
      setError(t.genericError); setLoading(null);
    }
  }
  const startCheckout = () => runCheckout(cycle === "yearly" ? "yearly" : "monthly");

  // Lien direct depuis l'e-mail d'urgence de fin d'essai (lib/email/notify.ts,
  // sendTrialLastDayEmail → /billing?checkout=monthly) : lance le Checkout
  // Stripe immédiatement, sans exiger un clic de plus sur cette page.
  useEffect(() => {
    const intent = searchParams.get("checkout");
    if (!intent || !canSubscribe) return;
    const plan = intent === "yearly" ? "yearly" : "monthly";
    setCycle(plan);
    runCheckout(plan);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

      <div className="rounded-2xl p-5" style={cardStyle}>
        <p className="text-sm font-semibold" style={{ color: "#1c1917" }}>{statusLabel}</p>
      </div>

      {canSubscribe && (
        <>
          {/* Toggle mensuel/annuel */}
          <div className="mt-6 mb-6 flex justify-center">
            <div className="inline-flex rounded-full p-1" style={{ background: "#f0ece6", border: "1px solid rgba(0,0,0,0.06)" }}>
              <button onClick={() => setCycle("monthly")}
                className="rounded-full px-5 py-2 text-sm font-medium transition"
                style={{ background: cycle === "monthly" ? "#1c1917" : "transparent", color: cycle === "monthly" ? "white" : "#78716c" }}>
                {t.toggleMonthly}
              </button>
              <button onClick={() => setCycle("yearly")}
                className="flex items-center gap-2 rounded-full px-5 py-2 text-sm font-medium transition"
                style={{ background: cycle === "yearly" ? "#1c1917" : "transparent", color: cycle === "yearly" ? "white" : "#78716c" }}>
                {t.toggleYearly}
                <span className="rounded-full px-2 py-0.5 text-[0.65rem] font-semibold" style={{ background: cycle === "yearly" ? "#c9a96e" : "rgba(201,169,110,0.18)", color: cycle === "yearly" ? "#1c1917" : "#a3823f" }}>
                  {t.saveBadge}
                </span>
              </button>
            </div>
          </div>

          {/* Grande carte de prix */}
          <div className="rounded-3xl p-8 sm:p-10" style={{ background: "#1c1917" }}>
            <p className="mb-1 text-sm font-medium" style={{ color: "#c9a96e" }}>folyo</p>
            <div className="mb-1 flex items-baseline gap-1.5">
              <span style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "3.25rem", fontWeight: 500, color: "#f8f5f0", lineHeight: 1 }}>
                {money(monthlyEquivalent)}
              </span>
              <span className="text-lg" style={{ color: "rgba(248,245,240,0.5)" }}>{t.perMonth}</span>
            </div>
            <p className="mb-8 text-sm" style={{ color: "rgba(248,245,240,0.4)" }}>
              {cycle === "yearly" ? t.billedYearlyTotal(money(YEARLY_PRICE)) : t.billedMonthly}
            </p>

            <ul className="mb-8 flex flex-col gap-3">
              {t.features.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm" style={{ color: "rgba(248,245,240,0.75)" }}>
                  <span className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full text-[0.6rem]" style={{ background: "rgba(201,169,110,0.18)", color: "#c9a96e" }}>✓</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>

            <button onClick={startCheckout} disabled={loading !== null}
              className="w-full rounded-xl py-3.5 text-sm font-semibold transition hover:opacity-90"
              style={{ background: "#c9a96e", color: "#1c1917", opacity: loading ? 0.6 : 1 }}>
              {loading === "checkout" ? t.redirecting : t.subscribeButton}
            </button>
            <p className="mt-3 text-center text-xs" style={{ color: "rgba(248,245,240,0.3)" }}>{t.plansNote}</p>
          </div>
        </>
      )}

      {hasStripeCustomer && (
        <button onClick={openPortal} disabled={loading !== null}
          className="mt-6"
          style={{ ...btnStyle, background: "transparent", color: "#78716c", border: "1px solid rgba(0,0,0,0.12)", opacity: loading ? 0.6 : 1 }}>
          {loading === "portal" ? t.redirecting : t.manageButton}
        </button>
      )}

      {error && <p className="mt-3 text-xs" style={{ color: "#dc2626" }}>{error}</p>}
    </div>
  );
}
