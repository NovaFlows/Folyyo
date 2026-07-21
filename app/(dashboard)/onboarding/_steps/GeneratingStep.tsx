"use client";

import { useEffect, useState } from "react";
import type { OnboardingData } from "../page";
import type { Dictionary } from "@/lib/i18n/dictionaries/fr";

function getSteps(profileType: string | null, t: Dictionary["onboarding"]) {
  if (profileType === "musicien") {
    return [
      "fetch youtube data",
      "generate portfolio.json",
      "build source code",
    ];
  }
  return [
    "upload cv.pdf",
    profileType === "developer" ? "fetch github data" : t.generating.analyzingProfile,
    "generate portfolio.json",
    "build source code",
  ];
}

interface Props {
  data: OnboardingData;
  t: Dictionary["onboarding"];
  onDone: (portfolioId: string) => void;
}

export default function GeneratingStep({ data, t, onDone }: Props) {
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const STEPS = getSteps(data.profileType, t);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        let cvStoragePath = "";
        let githubData = null;
        let youtubeData = null;

        if (data.profileType === "musicien") {
          // Musicien flow: YouTube first, no CV
          setCurrentStep(0);
          if (data.youtubeHandle) {
            const ytRes = await fetch(`/api/youtube/fetch?handle=${encodeURIComponent(data.youtubeHandle)}`);
            if (!ytRes.ok) {
              const e = await ytRes.json().catch(() => ({}));
              throw new Error(e.error || t.generating.errorYoutube);
            }
            ({ youtubeData } = await ytRes.json());
          } else {
            await new Promise((r) => setTimeout(r, 800));
          }

          if (cancelled) return;
          setCurrentStep(1);
        } else {
          // Standard flow: upload CV then fetch GitHub
          setCurrentStep(0);
          if (data.cvFile) {
            const formData = new FormData();
            formData.append("cv", data.cvFile);
            formData.append("profileType", data.profileType!);
            const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
            if (!uploadRes.ok) throw new Error(t.generating.errorCvUpload);
            ({ cvStoragePath } = await uploadRes.json());
          }

          if (cancelled) return;
          setCurrentStep(1);
          if (data.profileType === "developer" && data.githubUsername) {
            const ghRes = await fetch(`/api/github/fetch?username=${encodeURIComponent(data.githubUsername)}`);
            if (!ghRes.ok) throw new Error(t.generating.errorGithub);
            const parsed = await ghRes.json();
            githubData = parsed.githubData;
          } else {
            await new Promise((r) => setTimeout(r, 1200));
          }

          if (cancelled) return;
          setCurrentStep(2);
        }

        const generateRes = await fetch("/api/portfolio/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            profileType: data.profileType, slug: data.slug,
            name: data.name, title: data.title, country: data.country,
            email: data.email, githubUsername: data.githubUsername || undefined,
            instagramHandle: data.instagramHandle || undefined,
            youtubeHandle: data.youtubeHandle || undefined,
            linkedinUrl: data.linkedinUrl, twitterUrl: data.twitterUrl,
            cvStoragePath, githubData, youtubeData,
            templateId: data.templateId || undefined,
            styleUrl: data.styleUrl || undefined,
          }),
        });
        if (!generateRes.ok) {
          const e = await generateRes.json().catch(() => ({}));
          throw new Error(e.error || t.generating.errorGenerate);
        }
        const { portfolioId } = await generateRes.json();

        const isMusicien = data.profileType === "musicien";
        if (cancelled) return;
        // "build source code" — dernière étape affichée ; le portfolio est déjà
        // en ligne à cet instant (folyyo.com/[slug] lit site_json directement,
        // aucun déploiement séparé à attendre).
        setCurrentStep(isMusicien ? 2 : 3);
        await new Promise((r) => setTimeout(r, 500));

        if (!cancelled) onDone(portfolioId);
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      }
    }

    run();
    return () => { cancelled = true; };
  }, [data, onDone]); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-6 h-12 w-12 rounded-full flex items-center justify-center"
          style={{ background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.12)" }}>
          <span style={{ color: "#dc2626", fontSize: "1rem", fontFamily: "'JetBrains Mono', monospace" }}>×</span>
        </div>
        <h2 className="mb-2 text-xl serif" style={{ fontWeight: 500, color: "#1c1917" }}>
          {t.generating.errorTitle}
        </h2>
        <p className="mb-6 text-sm" style={{ color: "#78716c" }}>{error}</p>
        <button onClick={() => window.location.reload()}
          className="rounded-xl px-6 py-2.5 text-sm transition hover:opacity-70"
          style={{ border: "1px solid rgba(0,0,0,0.1)", color: "#78716c" }}>
          {t.generating.retry}
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 text-center">
        <h2 className="mb-1 text-2xl serif" style={{ fontWeight: 500, color: "#1c1917" }}>
          {t.generating.title}
        </h2>
        <p className="text-sm" style={{ color: "#a09a94" }}>{t.generating.subtitle}</p>
      </div>

      {/* Terminal build panel */}
      <div className="rounded-2xl overflow-hidden" style={{ background: "#111318", border: "1px solid rgba(255,255,255,0.05)" }}>
        {/* Window chrome */}
        <div className="flex items-center gap-1.5 px-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <div className="h-2.5 w-2.5 rounded-full" style={{ background: "rgba(255,95,87,0.5)" }} />
          <div className="h-2.5 w-2.5 rounded-full" style={{ background: "rgba(254,188,46,0.5)" }} />
          <div className="h-2.5 w-2.5 rounded-full" style={{ background: "rgba(40,200,64,0.5)" }} />
          <span className="ml-auto mono text-xs" style={{ color: "#2d3140" }}>folyyo build</span>
        </div>

        {/* Steps */}
        <div className="px-5 py-5 space-y-3">
          {STEPS.map((label, i) => {
            const done   = i < currentStep;
            const active = i === currentStep;
            return (
              <div key={i} className="flex items-center gap-3">
                <span className="mono text-xs w-3 shrink-0 select-none" style={{
                  color: done ? "#c9a96e" : active ? "#e8c88a" : "#2a2d38",
                }}>
                  {done ? "✓" : active ? "›" : "·"}
                </span>
                <span className="mono text-xs" style={{
                  color: done ? "#3a3f52" : active ? "rgba(255,255,255,0.88)" : "#2a2d38",
                  letterSpacing: "0.01em",
                }}>
                  {label}
                  {active && <span className="cursor-blink" style={{ color: "#c9a96e" }}>_</span>}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
