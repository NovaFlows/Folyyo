"use client";

import { useState, useEffect } from "react";
import { useUser, useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { clerkErrorMessage } from "@/lib/clerk-errors";
import { getDictionary } from "@/lib/i18n/dictionaries";
import type { Dictionary } from "@/lib/i18n/dictionaries/fr";
import type { Locale } from "@/lib/i18n/locale";
import PasswordInput from "@/components/auth/PasswordInput";

const cardStyle = { background: "#f0ece6", border: "1px solid rgba(0,0,0,0.06)" };
const inputStyle: React.CSSProperties = { width: "100%", background: "white", border: "1px solid rgba(0,0,0,0.1)", borderRadius: "0.75rem", padding: "0.7rem 1rem", fontSize: "0.875rem", color: "#1c1917", outline: "none" };
const labelStyle: React.CSSProperties = { display: "block", fontSize: "0.8125rem", color: "#78716c", marginBottom: "0.375rem" };
const btnStyle: React.CSSProperties = { borderRadius: "0.75rem", padding: "0.65rem 1.25rem", fontSize: "0.8125rem", fontWeight: 600, color: "white", background: "#1c1917", border: "none", cursor: "pointer" };

type SettingsDict = Dictionary["settings"];

// `locale` (une simple string) vient du Server Component page.tsx, qui la lit
// via getLocale() (cookie posé par le sélecteur de la navbar). On appelle
// getDictionary() ici côté client plutôt que de recevoir `t` en prop, car
// t.settings contient des fonctions (emailCurrent, emailCodeLabel) — jamais
// passer un slice de dictionnaire avec des fonctions d'un Server Component à
// un Client Component.
export default function SettingsPageClient({ locale }: { locale: Locale }) {
  const t = getDictionary(locale);

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl serif" style={{ fontWeight: 500, color: "#1c1917" }}>{t.settings.title}</h1>
      </div>

      <div className="space-y-6">
        <PortfolioLanguageSection t={t.settings} />
        <PasswordSection t={t.settings} />
        <EmailSection t={t.settings} />
        <DangerZone t={t.settings} />
      </div>
    </div>
  );
}

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl p-6" style={cardStyle}>
      <h2 className="text-sm font-semibold mb-1" style={{ color: "#1c1917" }}>{title}</h2>
      {description && <p className="text-xs mb-4" style={{ color: "#a09a94" }}>{description}</p>}
      {!description && <div className="mb-4" />}
      {children}
    </div>
  );
}

// ── Langue des portfolios générés (compte) ──────────────────────────────────
function PortfolioLanguageSection({ t }: { t: SettingsDict }) {
  const [language, setLanguage] = useState<"fr" | "en" | "es" | "de" | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/user/settings").then((r) => r.json()).then((s) => { if (!cancelled) setLanguage(s.language ?? "fr"); }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  async function update(next: "fr" | "en" | "es" | "de") {
    setLanguage(next); setSaving(true); setSaved(false);
    try {
      await fetch("/api/user/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ language: next }) });
      setSaved(true);
    } finally { setSaving(false); }
  }

  const LABELS = { fr: t.languageFr, en: t.languageEn, es: t.languageEs, de: t.languageDe };

  return (
    <Section title={t.languageTitle} description={t.languageDesc}>
      <div className="flex items-center gap-3">
        {(["fr", "en", "es", "de"] as const).map((l) => (
          <button key={l} onClick={() => update(l)} disabled={saving || language === null}
            className="rounded-xl px-4 py-2 text-sm font-medium transition"
            style={{
              background: language === l ? "#1c1917" : "white",
              color: language === l ? "white" : "#78716c",
              border: "1px solid rgba(0,0,0,0.1)",
              cursor: saving ? "default" : "pointer",
            }}>
            {LABELS[l]}
          </button>
        ))}
        {saved && <span className="text-xs" style={{ color: "#22a06b" }}>{t.saved}</span>}
      </div>
    </Section>
  );
}

// ── Mot de passe ─────────────────────────────────────────────────────────────
function PasswordSection({ t }: { t: SettingsDict }) {
  const { user } = useUser();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setError(null); setSuccess(false);
    if (next !== confirm) { setError(t.passwordMismatch); return; }
    setLoading(true);
    try {
      await user.updatePassword({ currentPassword: current, newPassword: next, signOutOfOtherSessions: false });
      setCurrent(""); setNext(""); setConfirm(""); setSuccess(true);
    } catch (err) {
      // eslint-disable-next-line no-console -- utile pour diagnostiquer le code d'erreur Clerk réel si le message générique de secours s'affiche
      console.error("updatePassword failed:", err);
      setError(clerkErrorMessage(err, t.passwordError));
    } finally { setLoading(false); }
  }

  return (
    <Section title={t.passwordTitle}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label style={labelStyle}>{t.passwordCurrent}</label>
          <PasswordInput value={current} onChange={setCurrent} required autoComplete="current-password" style={inputStyle} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label style={labelStyle}>{t.passwordNew}</label>
            <PasswordInput value={next} onChange={setNext} required minLength={8} autoComplete="new-password" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>{t.passwordConfirm}</label>
            <PasswordInput value={confirm} onChange={setConfirm} required minLength={8} autoComplete="new-password" style={inputStyle} />
          </div>
        </div>
        {error && <p className="text-xs" style={{ color: "#dc2626" }}>{error}</p>}
        {success && <p className="text-xs" style={{ color: "#22a06b" }}>{t.passwordSuccess}</p>}
        <button type="submit" disabled={loading} style={{ ...btnStyle, opacity: loading ? 0.6 : 1 }}>
          {loading ? t.passwordSubmitting : t.passwordSubmit}
        </button>
      </form>
    </Section>
  );
}

// ── Email ─────────────────────────────────────────────────────────────────────
function EmailSection({ t }: { t: SettingsDict }) {
  const { user } = useUser();
  const [newEmail, setNewEmail] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleRequestChange(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setError(null); setLoading(true);
    try {
      const emailResource = await user.createEmailAddress({ email: newEmail });
      await emailResource.prepareVerification({ strategy: "email_code" });
      setPendingId(emailResource.id);
    } catch (err) {
      setError(clerkErrorMessage(err, t.emailErrorAdd));
    } finally { setLoading(false); }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !pendingId) return;
    setError(null); setLoading(true);
    try {
      const emailResource = user.emailAddresses.find((e) => e.id === pendingId);
      if (!emailResource) throw new Error("not found");
      await emailResource.attemptVerification({ code });
      await user.update({ primaryEmailAddressId: pendingId });
      setPendingId(null); setNewEmail(""); setCode(""); setSuccess(true);
    } catch (err) {
      setError(clerkErrorMessage(err, t.emailErrorCode));
    } finally { setLoading(false); }
  }

  return (
    <Section title={t.emailTitle} description={t.emailCurrent(user?.primaryEmailAddress?.emailAddress ?? "…")}>
      {!pendingId ? (
        <form onSubmit={handleRequestChange} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label style={labelStyle}>{t.emailNew}</label>
            <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} required style={inputStyle} placeholder="nouvelle@adresse.com" />
          </div>
          <button type="submit" disabled={loading} style={{ ...btnStyle, opacity: loading ? 0.6 : 1, whiteSpace: "nowrap" }}>
            {loading ? t.emailSending : t.emailSendCode}
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerify} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label style={labelStyle}>{t.emailCodeLabel(newEmail)}</label>
            <input type="text" inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value)} required style={inputStyle} placeholder="000000" />
          </div>
          <button type="submit" disabled={loading} style={{ ...btnStyle, opacity: loading ? 0.6 : 1, whiteSpace: "nowrap" }}>
            {loading ? t.emailVerifying : t.emailConfirm}
          </button>
        </form>
      )}
      {error && <p className="mt-2 text-xs" style={{ color: "#dc2626" }}>{error}</p>}
      {success && <p className="mt-2 text-xs" style={{ color: "#22a06b" }}>{t.emailSuccess}</p>}
    </Section>
  );
}

// ── Zone sensible : désactivation / suppression ────────────────────────────
function DangerZone({ t }: { t: SettingsDict }) {
  const { signOut } = useClerk();
  const router = useRouter();
  const [confirmingDeactivate, setConfirmingDeactivate] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteText, setDeleteText] = useState("");
  const [loading, setLoading] = useState<"deactivate" | "delete" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleDeactivate() {
    setLoading("deactivate"); setError(null);
    try {
      const res = await fetch("/api/user/deactivate", { method: "POST" });
      if (!res.ok) throw new Error();
      await signOut();
      router.push("/");
    } catch {
      setError(t.deactivateError);
      setLoading(null);
    }
  }

  async function handleDelete() {
    setLoading("delete"); setError(null);
    try {
      const res = await fetch("/api/user/delete", { method: "POST" });
      if (!res.ok) throw new Error();
      await signOut();
      router.push("/");
    } catch {
      setError(t.deleteError);
      setLoading(null);
    }
  }

  return (
    <div className="rounded-2xl p-6" style={{ background: "rgba(220,38,38,0.04)", border: "1px solid rgba(220,38,38,0.15)" }}>
      <h2 className="text-sm font-semibold mb-4" style={{ color: "#dc2626" }}>{t.dangerTitle}</h2>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium" style={{ color: "#1c1917" }}>{t.deactivateTitle}</p>
          <p className="text-xs" style={{ color: "#78716c" }}>{t.deactivateDesc}</p>
        </div>
        {!confirmingDeactivate ? (
          <button onClick={() => setConfirmingDeactivate(true)}
            className="rounded-xl px-4 py-2 text-xs font-medium transition hover:opacity-80"
            style={{ border: "1px solid rgba(0,0,0,0.12)", color: "#78716c", background: "white" }}>
            {t.deactivateButton}
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button onClick={() => setConfirmingDeactivate(false)} className="text-xs" style={{ color: "#a09a94" }}>{t.cancel}</button>
            <button onClick={handleDeactivate} disabled={loading === "deactivate"}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-white transition hover:opacity-80"
              style={{ background: "#d97706" }}>
              {loading === "deactivate" ? t.deactivateLoading : t.deactivateConfirm}
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-5" style={{ borderTop: "1px solid rgba(220,38,38,0.12)" }}>
        <div>
          <p className="text-sm font-medium" style={{ color: "#1c1917" }}>{t.deleteTitle}</p>
          <p className="text-xs" style={{ color: "#78716c" }}>{t.deleteDesc}</p>
        </div>
        {!confirmingDelete ? (
          <button onClick={() => setConfirmingDelete(true)}
            className="rounded-xl px-4 py-2 text-xs font-medium text-white transition hover:opacity-80"
            style={{ background: "#dc2626" }}>
            {t.deleteButton}
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <input value={deleteText} onChange={(e) => setDeleteText(e.target.value)} placeholder={t.deleteConfirmPlaceholder}
              onKeyDown={(e) => { if (e.key === "Enter" && deleteText === t.deleteConfirmWord && loading !== "delete") handleDelete(); }}
              autoFocus
              className="rounded-xl px-3 py-2 text-xs" style={{ border: "1px solid rgba(220,38,38,0.3)", width: 140 }} />
            <button onClick={() => { setConfirmingDelete(false); setDeleteText(""); }} className="text-xs" style={{ color: "#a09a94" }}>{t.cancel}</button>
            <button onClick={handleDelete} disabled={deleteText !== t.deleteConfirmWord || loading === "delete"}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-white transition hover:opacity-80 disabled:opacity-40"
              style={{ background: "#dc2626" }}>
              {loading === "delete" ? t.deleteLoading : t.deleteConfirmButton}
            </button>
          </div>
        )}
      </div>

      {error && <p className="mt-4 text-xs" style={{ color: "#dc2626" }}>{error}</p>}
    </div>
  );
}
