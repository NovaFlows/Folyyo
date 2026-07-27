"use client";

import { useState, useEffect } from "react";
import { useSignIn, useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { clerkErrorMessage } from "@/lib/clerk-errors";
import { useLocale } from "@/lib/i18n/useLocale";
import { getDictionary } from "@/lib/i18n/dictionaries";
import LanguageToggle from "@/components/i18n/LanguageToggle";
import PasswordInput from "@/components/auth/PasswordInput";
import { GitHubIcon, GoogleIcon, LinkedInIcon } from "@/components/auth/OAuthIcons";

export default function LoginPage() {
  const [locale, setLocale] = useLocale();
  const t = getDictionary(locale);
  const { isSignedIn } = useAuth();
  const { signIn, setActive, isLoaded } = useSignIn();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState<string | null>(null);
  const [loading, setLoading]   = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (isSignedIn) router.replace("/dashboard");
  }, [isSignedIn, router]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    // ─── DEBUG TEMPORAIRE (à retirer une fois le souci de connexion élucidé) ───
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const clerkInfo = (window as any)?.Clerk;
    console.log("[LOGIN DEBUG] submit", {
      email: JSON.stringify(email),
      passwordLength: password.length,
      isLoaded,
      publishableKey: clerkInfo?.publishableKey,
      frontendApi: clerkInfo?.frontendApi,
      domain: clerkInfo?.domain,
    });
    if (!isLoaded) { console.log("[LOGIN DEBUG] abort: !isLoaded"); return; }
    if (!email.includes("@")) { setError(t.auth.login.invalidEmail); return; }
    setLoading(true); setError(null);
    try {
      const result = await signIn.create({ identifier: email.trim(), password });
      console.log("[LOGIN DEBUG] create OK", {
        status: result.status,
        createdSessionId: result.createdSessionId,
        supportedFirstFactors: (result as any).supportedFirstFactors,
      });
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.push("/dashboard");
      } else {
        console.warn("[LOGIN DEBUG] statut inattendu:", result.status, result);
        setError(`${t.auth.login.genericError} [DEBUG status: ${result.status}]`);
        setLoading(false);
      }
    } catch (err: unknown) {
      const anyErr = err as any;
      const clerkErrors = anyErr?.errors as Array<{ code?: string; message?: string; longMessage?: string }> | undefined;
      console.error("[LOGIN DEBUG] échec — objet brut:", err);
      console.error("[LOGIN DEBUG] clerkError:", anyErr?.clerkError, "status:", anyErr?.status);
      console.error("[LOGIN DEBUG] errors[]:", clerkErrors);
      try { console.error("[LOGIN DEBUG] JSON:", JSON.stringify(anyErr, Object.getOwnPropertyNames(anyErr ?? {}))); } catch {}
      const first = clerkErrors?.[0];
      const dbg = first?.code ?? anyErr?.message ?? "inconnu";
      setError(`${clerkErrorMessage(err, t.auth.login.genericError, locale)} [DEBUG code: ${dbg}]`);
      setLoading(false);
    }
    /* eslint-enable @typescript-eslint/no-explicit-any */
  }

  async function handleOAuth(strategy: "oauth_github" | "oauth_google" | "oauth_linkedin_oidc") {
    if (!isLoaded) return;
    try {
      await signIn.authenticateWithRedirect({
        strategy,
        redirectUrl: "/sso-callback",
        redirectUrlComplete: "/dashboard",
      });
    } catch (err: unknown) {
      setError(clerkErrorMessage(err, t.auth.oauthError, locale));
    }
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
            folyo
          </Link>
          <p className="mt-2 text-sm" style={{ color: "#78716c" }}>{t.auth.login.welcome}</p>
        </div>

        <div className="rounded-2xl p-8" style={{ background: "#f0ece6", border: "1px solid rgba(0,0,0,0.06)" }}>
          <div className="mb-6 flex flex-col gap-3">
            <button
              onClick={() => handleOAuth("oauth_github")}
              className="flex w-full items-center justify-center gap-3 rounded-xl py-3 text-sm font-medium transition hover:opacity-80"
              style={{ background: "white", border: "1px solid rgba(0,0,0,0.1)", color: "#1c1917" }}
            >
              <GitHubIcon />
              {t.auth.continueWithGithub}
            </button>
            <button
              onClick={() => handleOAuth("oauth_google")}
              className="flex w-full items-center justify-center gap-3 rounded-xl py-3 text-sm font-medium transition hover:opacity-80"
              style={{ background: "white", border: "1px solid rgba(0,0,0,0.1)", color: "#1c1917" }}
            >
              <GoogleIcon />
              {t.auth.continueWithGoogle}
            </button>
            <button
              onClick={() => handleOAuth("oauth_linkedin_oidc")}
              className="flex w-full items-center justify-center gap-3 rounded-xl py-3 text-sm font-medium transition hover:opacity-80"
              style={{ background: "white", border: "1px solid rgba(0,0,0,0.1)", color: "#1c1917" }}
            >
              <LinkedInIcon />
              {t.auth.continueWithLinkedin}
            </button>
          </div>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t" style={{ borderColor: "rgba(0,0,0,0.08)" }} />
            </div>
            <div className="relative flex justify-center text-xs" style={{ color: "#a09a94" }}>
              <span className="px-3" style={{ background: "#f0ece6" }}>{t.auth.orWithEmail}</span>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm" style={{ color: "#78716c" }}>{t.auth.email}</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                className="input-warm" placeholder="toi@exemple.com" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm" style={{ color: "#78716c" }}>{t.auth.password}</label>
              <PasswordInput value={password} onChange={setPassword} required autoComplete="current-password"
                className="input-warm" placeholder={t.auth.login.passwordPlaceholder} />
            </div>

            {error && (
              <p className="rounded-xl px-4 py-2.5 text-sm" style={{ background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.15)", color: "#dc2626" }}>
                {error}
              </p>
            )}

            <button type="submit" disabled={loading}
              className="w-full rounded-xl py-3 text-sm font-semibold text-white transition hover:opacity-80 disabled:opacity-50"
              style={{ background: "#1c1917" }}>
              {loading ? t.auth.login.submitting : t.auth.login.submit}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm" style={{ color: "#a09a94" }}>
          {t.auth.login.noAccount}{" "}
          <Link href="/signup" style={{ color: "#c9a96e" }} className="hover:opacity-80 transition">{t.auth.login.signupLink}</Link>
        </p>
      </div>
    </div>
  );
}
