"use client";

import { useState, useEffect } from "react";
import { useSignIn, useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { clerkErrorMessage } from "@/lib/clerk-errors";

export default function LoginPage() {
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
    if (!isLoaded) return;
    if (!email.includes("@")) { setError("Merci de saisir une adresse email valide (ex : toi@exemple.com)."); return; }
    setLoading(true); setError(null);
    try {
      const result = await signIn.create({ identifier: email, password });
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.push("/dashboard");
      }
    } catch (err: unknown) {
      setError(clerkErrorMessage(err, "Email ou mot de passe incorrect."));
      setLoading(false);
    }
  }

  async function handleGitHub() {
    if (!isLoaded) return;
    await signIn.authenticateWithRedirect({
      strategy: "oauth_github",
      redirectUrl: "/sso-callback",
      redirectUrlComplete: "/dashboard",
    });
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4" style={{ background: "#f8f5f0" }}>
      <Link href="/" className="fixed left-6 top-6 inline-flex items-center gap-1.5 text-sm transition hover:opacity-70" style={{ color: "#a09a94" }}>
        ← Retour à l&apos;accueil
      </Link>
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link href="/" style={{ fontFamily: "'Playfair Display', Georgia, serif", color: "#1c1917", fontSize: "1.75rem", fontWeight: 500 }}>
            folyyo
          </Link>
          <p className="mt-2 text-sm" style={{ color: "#78716c" }}>Bienvenue de retour</p>
        </div>

        <div className="rounded-2xl p-8" style={{ background: "#f0ece6", border: "1px solid rgba(0,0,0,0.06)" }}>
          <button
            onClick={handleGitHub}
            className="mb-6 flex w-full items-center justify-center gap-3 rounded-xl py-3 text-sm font-medium transition hover:opacity-80"
            style={{ background: "white", border: "1px solid rgba(0,0,0,0.1)", color: "#1c1917" }}
          >
            <GitHubIcon />
            Continuer avec GitHub
          </button>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t" style={{ borderColor: "rgba(0,0,0,0.08)" }} />
            </div>
            <div className="relative flex justify-center text-xs" style={{ color: "#a09a94" }}>
              <span className="px-3" style={{ background: "#f0ece6" }}>ou avec email</span>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm" style={{ color: "#78716c" }}>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                className="input-warm" placeholder="toi@exemple.com" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm" style={{ color: "#78716c" }}>Mot de passe</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
                className="input-warm" placeholder="••••••••" />
            </div>

            {error && (
              <p className="rounded-xl px-4 py-2.5 text-sm" style={{ background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.15)", color: "#dc2626" }}>
                {error}
              </p>
            )}

            <button type="submit" disabled={loading}
              className="w-full rounded-xl py-3 text-sm font-semibold text-white transition hover:opacity-80 disabled:opacity-50"
              style={{ background: "#1c1917" }}>
              {loading ? "Connexion…" : "Se connecter"}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm" style={{ color: "#a09a94" }}>
          Pas encore de compte ?{" "}
          <Link href="/signup" style={{ color: "#c9a96e" }} className="hover:opacity-80 transition">S&apos;inscrire</Link>
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
