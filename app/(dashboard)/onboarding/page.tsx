"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ProfileTypeStep from "./_steps/ProfileTypeStep";
import TemplatePickerStep from "./_steps/TemplatePickerStep";
import DeveloperFormStep from "./_steps/DeveloperFormStep";
import ArtistFormStep from "./_steps/ArtistFormStep";
import FashionFormStep from "./_steps/FashionFormStep";
import MusicianFormStep from "./_steps/MusicianFormStep";
import GeneratingStep from "./_steps/GeneratingStep";

export type OnboardingData = {
  profileType: "developer" | "artist" | "fashion" | "other" | "musicien" | null;
  templateId: string | null;
  styleUrl: string;
  slug: string;
  name: string;
  title: string;
  email: string;
  githubUsername: string;
  instagramHandle: string;
  youtubeHandle: string;
  linkedinUrl: string;
  twitterUrl: string;
  cvFile: File | null;
};

const INITIAL_DATA: OnboardingData = {
  profileType: null, templateId: null, styleUrl: "", slug: "", name: "", title: "", email: "",
  githubUsername: "", instagramHandle: "", youtubeHandle: "", linkedinUrl: "", twitterUrl: "", cvFile: null,
};

const STEP_LABELS = ["Profil", "Style", "Infos", "Génération"];

export default function OnboardingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<"type" | "template" | "form" | "generating">("type");
  const [data, setData] = useState<OnboardingData>(INITIAL_DATA);

  // Lien profond depuis /community : ?templateId=<id> = on ne reprend QUE le style
  // visuel du template. L'utilisateur choisit ensuite son propre métier (le
  // template d'un musicien ne fait pas de lui un musicien).
  useEffect(() => {
    const deepLinkId = searchParams.get("templateId");
    if (!deepLinkId) return;
    let cancelled = false;
    fetch(`/api/community/template/${deepLinkId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled || !d) return;
        setData((prev) => ({ ...prev, templateId: deepLinkId }));
        setStep("type");
      })
      .catch(() => {});
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updateData(partial: Partial<OnboardingData>) {
    setData((prev) => ({ ...prev, ...partial }));
  }

  const stepIndex = { type: 0, template: 1, form: 2, generating: 3 }[step];

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12" style={{ background: "#f8f5f0" }}>
      {/* Progress */}
      <div className="mb-10 flex items-center gap-2">
        {STEP_LABELS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition"
                style={{
                  background: i <= stepIndex ? "#1c1917" : "#f0ece6",
                  color: i <= stepIndex ? "white" : "#a09a94",
                  border: `1px solid ${i <= stepIndex ? "#1c1917" : "rgba(0,0,0,0.08)"}`,
                }}>
                {i < stepIndex ? "✓" : i + 1}
              </div>
              <span className="text-xs hidden sm:block" style={{ color: i === stepIndex ? "#1c1917" : "#a09a94" }}>
                {label}
              </span>
            </div>
            {i < STEP_LABELS.length - 1 && <div className="h-px w-8" style={{ background: i < stepIndex ? "#c9a96e" : "rgba(0,0,0,0.1)" }} />}
          </div>
        ))}
      </div>

      <div className="w-full max-w-xl">
        {step === "type" && (
          <ProfileTypeStep selected={data.profileType}
            onSelect={(type) => {
              updateData({ profileType: type });
              // Un style déjà choisi (lien /community) → on saute le sélecteur de template
              setStep(data.templateId ? "form" : "template");
            }} />
        )}

        {step === "template" && data.profileType && (
          <TemplatePickerStep profileType={data.profileType} templateId={data.templateId} styleUrl={data.styleUrl}
            onSelect={(id) => updateData({ templateId: id })}
            onStyleUrlChange={(url) => updateData({ styleUrl: url })}
            onBack={() => setStep("type")} onContinue={() => setStep("form")} />
        )}

        {step === "form" && data.profileType === "developer" && (
          <DeveloperFormStep data={data} onChange={updateData}
            onBack={() => setStep("template")} onSubmit={() => setStep("generating")} />
        )}

        {step === "form" && data.profileType === "artist" && (
          <ArtistFormStep data={data} onChange={updateData}
            onBack={() => setStep("template")} onSubmit={() => setStep("generating")} />
        )}

        {step === "form" && data.profileType === "fashion" && (
          <FashionFormStep data={data} onChange={updateData}
            onBack={() => setStep("template")} onSubmit={() => setStep("generating")} />
        )}

        {step === "form" && data.profileType === "musicien" && (
          <MusicianFormStep data={data} onChange={updateData}
            onBack={() => setStep("template")} onSubmit={() => setStep("generating")} />
        )}

        {step === "form" && data.profileType === "other" && (
          <ArtistFormStep data={data} onChange={updateData}
            onBack={() => setStep("template")} onSubmit={() => setStep("generating")} />
        )}

        {step === "generating" && (
          <GeneratingStep data={data} onDone={(id) => router.push(`/portfolio/${id}`)} />
        )}
      </div>
    </div>
  );
}
