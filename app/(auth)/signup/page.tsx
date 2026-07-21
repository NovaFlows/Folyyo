"use client";

import { useState, useEffect } from "react";
import { useSignUp, useAuth } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { clerkErrorMessage } from "@/lib/clerk-errors";
import { useLocale } from "@/lib/i18n/useLocale";
import { getDictionary } from "@/lib/i18n/dictionaries";
import LanguageToggle from "@/components/i18n/LanguageToggle";
import PasswordInput from "@/components/auth/PasswordInput";
import CountrySelect from "@/components/auth/CountrySelect";

export default function SignupPage() {
  const [locale, setLocale] = useLocale();
  const t = getDictionary(locale);
  const { isSignedIn } = useAuth();
  const { signUp, setActive, isLoaded } = useSignUp();
  const [email, setEmail]             = useState("");
  const [country, setCountry]         = useState("");
  const [password, setPassword]       = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [code, setCode]         = useState("");
  const [error, setError]       = useState<string | null>(null);
  const [loading, setLoading]   = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendMsg, setResendMsg] = useState<string | null>(null);
  const [cooldown, setCooldown]   = useState(0);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Slug déjà choisi via le vérificateur de disponibilité du hero de la
  // landing (?slug=...) — repris ici sans le faire retaper, mémorisé en
  // sessionStorage (survit à la redirection GitHub OAuth) pour que
  // l'onboarding le reprenne une fois le compte créé (voir
  // app/(dashboard)/onboarding/page.tsx).
  useEffect(() => {
    const pendingSlug = searchParams.get("slug");
    if (pendingSlug) sessionStorage.setItem("folyyo_pending_slug", pendingSlug);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isSignedIn) router.replace("/dashboard");
  }, [isSignedIn, router]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    if (!isLoaded) return;
    if (!email.includes("@")) { setError(t.auth.signup.invalidEmail); return; }
    if (!country) { setError(t.auth.signup.countryRequired); return; }
    if (password !== confirmPassword) { setError(t.auth.signup.passwordMismatch); return; }
    setLoading(true); setError(null);
    try {
      await signUp.create({ emailAddress: email, password });
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setVerifying(true);
      setCooldown(60);
    } catch (err: unknown) {
      setError(clerkErrorMessage(err, t.auth.signup.genericError, locale));
    } finally { setLoading(false); }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!isLoaded) return;
    setLoading(true); setError(null);
    try {
      const result = await signUp.attemptEmailAddressVerification({ code });
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        // Best-effort : le pays a déjà été choisi dans le formulaire d'inscription
        // (voir plus bas) — enregistré ici, une fois la session active (avant ça,
        // aucun appel API authentifié n'est possible). Si ça échoue, l'étape pays
        // de l'onboarding (CountryStep) sert de filet de sécurité.
        fetch("/api/user/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ country }),
        }).catch(() => {});
        router.push("/onboarding");
      }
    } catch (err: unknown) {
      setError(clerkErrorMessage(err, t.auth.verify.invalidCode, locale));
      setLoading(false);
    }
  }

  async function handleResendCode() {
    if (!isLoaded || resending || cooldown > 0) return;
    setResending(true); setError(null); setResendMsg(null);
    try {
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setResendMsg(t.auth.verify.resendSuccess);
      setCooldown(60);
    } catch (err: unknown) {
      setError(clerkErrorMessage(err, t.auth.verify.resendError, locale));
    } finally { setResending(false); }
  }

  async function handleGitHub() {
    if (!isLoaded) return;
    await signUp.authenticateWithRedirect({
      strategy: "oauth_github",
      redirectUrl: "/sso-callback",
      redirectUrlComplete: "/onboarding",
    });
  }

  const cardStyle = { background: "#f0ece6", border: "1px solid rgba(0,0,0,0.06)" };

  if (verifying) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4" style={{ background: "#f8f5f0" }}>
        <button onClick={() => { setVerifying(false); setError(null); setResendMsg(null); }}
          className="fixed left-6 top-6 inline-flex items-center gap-1.5 text-sm transition hover:opacity-70" style={{ color: "#a09a94", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
          {t.auth.backToEmail}
        </button>
        <div className="fixed right-6 top-6">
          <LanguageToggle locale={locale} onChange={setLocale} />
        </div>
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <Link href="/" style={{ fontFamily: "'Playfair Display', Georgia, serif", color: "#1c1917", fontSize: "1.75rem", fontWeight: 500 }}>
              folyyo
            </Link>
            <p className="mt-2 text-sm" style={{ color: "#78716c" }}>{t.auth.verify.checkEmail}</p>
            <p className="mt-1 text-xs" style={{ color: "#a09a94" }}>{t.auth.verify.codeSentTo} <strong style={{ color: "#78716c" }}>{email}</strong></p>
          </div>
          <div className="rounded-2xl p-8" style={cardStyle}>
            <form onSubmit={handleVerify} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm" style={{ color: "#78716c" }}>{t.auth.verify.codeLabel}</label>
                <input type="text" inputMode="numeric" value={code} onChange={(e) => setCode(e.target.value)}
                  required maxLength={6}
                  className="w-full rounded-xl py-3 text-center text-2xl tracking-widest outline-none transition"
                  style={{ background: "white", border: "1px solid rgba(0,0,0,0.1)", color: "#1c1917" }}
                  placeholder="000000" />
              </div>
              {error && <p className="rounded-xl px-4 py-2.5 text-sm" style={{ background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.15)", color: "#dc2626" }}>{error}</p>}
              {resendMsg && <p className="rounded-xl px-4 py-2.5 text-sm" style={{ background: "rgba(34,160,107,0.08)", border: "1px solid rgba(34,160,107,0.2)", color: "#22a06b" }}>{resendMsg}</p>}
              <button type="submit" disabled={loading}
                className="w-full rounded-xl py-3 text-sm font-semibold text-white transition hover:opacity-80 disabled:opacity-50"
                style={{ background: "#1c1917" }}>
                {loading ? t.auth.verify.submitting : t.auth.verify.submit}
              </button>
            </form>
            <p className="mt-5 text-center text-sm" style={{ color: "#a09a94" }}>
              {t.auth.verify.noCode}{" "}
              <button onClick={handleResendCode} disabled={resending||cooldown>0}
                className="font-medium transition hover:opacity-80 disabled:opacity-50" style={{ color: "#c9a96e", background: "none", border: "none", cursor: (resending||cooldown>0) ? "default" : "pointer", padding: 0 }}>
                {resending ? t.auth.verify.resendSending : cooldown>0 ? t.auth.verify.resendCooldown(cooldown) : t.auth.verify.resend}
              </button>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4" style={{ background: "#f8f5f0" }}>
      <Link href="/" className="fixed left-6 top-6 inline-flex items-center gap-1.5 text-sm transition hover:opacity-70" style={{ color: "#a09a94" }}>
        {t.auth.backHome}
      </Link>
      <div className="fixed right-6 top-6">
        <LanguageToggle locale={locale} onChange={setLocale} />
      </div>
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link href="/" style={{ fontFamily: "'Playfair Display', Georgia, serif", color: "#1c1917", fontSize: "1.75rem", fontWeight: 500 }}>
            folyyo
          </Link>
          <p className="mt-2 text-sm" style={{ color: "#78716c" }}>{t.auth.signup.title}</p>
        </div>

        <div className="rounded-2xl p-8" style={cardStyle}>
          <button onClick={handleGitHub}
            className="mb-6 flex w-full items-center justify-center gap-3 rounded-xl py-3 text-sm font-medium transition hover:opacity-80"
            style={{ background: "white", border: "1px solid rgba(0,0,0,0.1)", color: "#1c1917" }}>
            <GitHubIcon />
            {t.auth.continueWithGithub}
          </button>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t" style={{ borderColor: "rgba(0,0,0,0.08)" }} />
            </div>
            <div className="relative flex justify-center text-xs" style={{ color: "#a09a94" }}>
              <span className="px-3" style={{ background: "#f0ece6" }}>{t.auth.orWithEmail}</span>
            </div>
          </div>

          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm" style={{ color: "#78716c" }}>{t.auth.email}</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                className="input-warm" placeholder="toi@exemple.com" />
            </div>
            <CountrySelect value={country} onChange={setCountry} />
            <div>
              <label className="mb-1.5 block text-sm" style={{ color: "#78716c" }}>{t.auth.password}</label>
              <PasswordInput value={password} onChange={setPassword} required minLength={8}
                className="input-warm" placeholder={t.auth.signup.passwordPlaceholder} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm" style={{ color: "#78716c" }}>{t.auth.signup.confirmPassword}</label>
              <PasswordInput value={confirmPassword} onChange={setConfirmPassword} required minLength={8}
                className="input-warm" placeholder={t.auth.signup.confirmPasswordPlaceholder} />
            </div>
            {error && <p className="rounded-xl px-4 py-2.5 text-sm" style={{ background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.15)", color: "#dc2626" }}>{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full rounded-xl py-3 text-sm font-semibold text-white transition hover:opacity-80 disabled:opacity-50"
              style={{ background: "#1c1917" }}>
              {loading ? t.auth.signup.submitting : t.auth.signup.submit}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm" style={{ color: "#a09a94" }}>
          {t.auth.signup.haveAccount}{" "}
          <Link href="/login" style={{ color: "#c9a96e" }} className="hover:opacity-80 transition">{t.auth.signup.loginLink}</Link>
        </p>
      </div>
    </div>
  );
}

function GitHubIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}
