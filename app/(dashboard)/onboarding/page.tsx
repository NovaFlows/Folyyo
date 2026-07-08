"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ProfileTypeStep from "./_steps/ProfileTypeStep";
import DeveloperFormStep from "./_steps/DeveloperFormStep";
import GeneratingStep from "./_steps/GeneratingStep";

export type OnboardingData = {
  profileType: "developer" | "artist" | "fashion" | "other" | null;
  slug: string;
  name: string;
  title: string;
  email: string;
  githubUsername: string;
  linkedinUrl: string;
  twitterUrl: string;
  cvFile: File | null;
};

const INITIAL_DATA: OnboardingData = {
  profileType: null, slug: "", name: "", title: "", email: "",
  githubUsername: "", linkedinUrl: "", twitterUrl: "", cvFile: null,
};

const STEP_LABELS = ["Profil", "Infos", "Génération"];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<"type" | "form" | "generating">("type");
  const [data, setData] = useState<OnboardingData>(INITIAL_DATA);

  function updateData(partial: Partial<OnboardingData>) {
    setData((prev) => ({ ...prev, ...partial }));
  }

  const stepIndex = { type: 0, form: 1, generating: 2 }[step];

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
            {i < 2 && <div className="h-px w-8" style={{ background: i < stepIndex ? "#c9a96e" : "rgba(0,0,0,0.1)" }} />}
          </div>
        ))}
      </div>

      <div className="w-full max-w-xl">
        {step === "type" && (
          <ProfileTypeStep selected={data.profileType}
            onSelect={(type) => { updateData({ profileType: type }); setStep("form"); }} />
        )}
        {step === "form" && data.profileType === "developer" && (
          <DeveloperFormStep data={data} onChange={updateData}
            onBack={() => setStep("type")} onSubmit={() => setStep("generating")} />
        )}
        {step === "generating" && (
          <GeneratingStep data={data} onDone={(id) => router.push(`/portfolio/${id}`)} />
        )}
      </div>
    </div>
  );
}
