"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale } from "@/lib/i18n/useLocale";
import { getDictionary } from "@/lib/i18n/dictionaries";
import LanguageToggle from "@/components/i18n/LanguageToggle";
import CountryStep from "./_steps/CountryStep";
import ProfileTypeStep from "./_steps/ProfileTypeStep";
import TemplatePickerStep from "./_steps/TemplatePickerStep";
import DeveloperFormStep from "./_steps/DeveloperFormStep";
import ArtistFormStep from "./_steps/ArtistFormStep";
import FashionFormStep from "./_steps/FashionFormStep";
import MusicianFormStep from "./_steps/MusicianFormStep";
import GeneratingStep from "./_steps/GeneratingStep";
import ShareStep from "./_steps/ShareStep";

export type OnboardingData = {
  profileType: "developer" | "designer" | "photographe" | "artist" | "fashion" | "other" | "musicien" | null;
  templateId: string | null;
  styleUrl: string;
  slug: string;
  name: string;
  title: string;
  email: string;
  country: string;
  githubUsername: string;
  instagramHandle: string;
  youtubeHandle: string;
  linkedinUrl: string;
  twitterUrl: string;
  websiteUrl: string;
  cvFile: File | null;
};

const INITIAL_DATA: OnboardingData = {
  profileType: null, templateId: null, styleUrl: "", slug: "", name: "", title: "", email: "", country: "",
  githubUsername: "", instagramHandle: "", youtubeHandle: "", linkedinUrl: "", twitterUrl: "", websiteUrl: "", cvFile: null,
};

export default function OnboardingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [locale, setLocale] = useLocale();
  const t = getDictionary(locale);
  const STEP_LABELS = t.onboarding.stepLabels;
  const [step, setStep] = useState<"checking" | "country" | "type" | "template" | "form" | "generating" | "share">("checking");
  const [data, setData] = useState<OnboardingData>(INITIAL_DATA);
  // Portfolio fraîchement généré — connu dès "share", utilisé seulement à la
  // navigation finale vers son détail dans le dashboard.
  const [generatedPortfolioId, setGeneratedPortfolioId] = useState<string | null>(null);

  // Le pays n'est demandé qu'une fois, à la toute première visite de
  // l'onboarding (juste après la création du compte) — s'il est déjà
  // enregistré (compte existant, ou portfolio supplémentaire), on saute
  // directement à l'étape du profil.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/user/settings")
      .then((r) => (r.ok ? r.json() : null))
      .then((s) => {
        if (cancelled) return;
        if (s?.country) { setData((prev) => ({ ...prev, country: s.country })); setStep("type"); }
        else setStep("country");
      })
      .catch(() => { if (!cancelled) setStep("country"); });
    return () => { cancelled = true; };
  }, []);

  // Slug déjà choisi via le vérificateur de disponibilité du hero de la
  // landing, transmis à travers l'inscription via sessionStorage (voir
  // app/(auth)/signup/page.tsx) — repris une seule fois, puis effacé pour ne
  // pas resservir sur un portfolio suivant.
  useEffect(() => {
    const pendingSlug = sessionStorage.getItem("folyyo_pending_slug");
    if (pendingSlug) {
      updateData({ slug: pendingSlug.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 30) });
      sessionStorage.removeItem("folyyo_pending_slug");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Lien profond depuis /community : ?templateId=<id> = on ne reprend QUE le style
  // visuel du template (jamais son contenu — revérifié serveur à la génération).
  // L'utilisateur choisit ensuite son propre métier (le template d'un musicien
  // ne fait pas de lui un musicien). Existence du template revalidée ici pour
  // ignorer silencieusement un lien mort plutôt que de le transmettre tel quel.
  useEffect(() => {
    const deepLinkId = searchParams.get("templateId");
    if (!deepLinkId) return;
    let cancelled = false;
    fetch(`/api/community/template/${deepLinkId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled || !d) return;
        setData((prev) => ({ ...prev, templateId: deepLinkId }));
      })
      .catch(() => {});
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updateData(partial: Partial<OnboardingData>) {
    setData((prev) => ({ ...prev, ...partial }));
  }

  const stepIndex = { checking: -1, country: -1, type: 0, template: 1, form: 2, generating: 3, share: 3 }[step];

  if (step === "checking") {
    return <div className="flex min-h-screen items-center justify-center px-4" style={{ background: "#f8f5f0" }} />;
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12" style={{ background: "#f8f5f0" }}>
      <div className="fixed right-6 top-6">
        <LanguageToggle locale={locale} onChange={setLocale} />
      </div>
      {/* Progress — masquée pour l'étape pays, préambule hors numérotation */}
      {step !== "country" && (
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
      )}

      <div className="w-full max-w-xl">
        {step === "country" && (
          <CountryStep country={data.country} t={t.onboarding}
            onChange={(country) => updateData({ country })}
            onContinue={() => setStep("type")} />
        )}

        {step === "type" && (
          <ProfileTypeStep selected={data.profileType} t={t.onboarding}
            onSelect={(type) => {
              updateData({ profileType: type });
              // Un style déjà choisi (lien /community) → on saute le sélecteur de template
              setStep(data.templateId ? "form" : "template");
            }} />
        )}

        {step === "template" && data.profileType && (
          <TemplatePickerStep profileType={data.profileType} templateId={data.templateId} styleUrl={data.styleUrl} t={t.onboarding} templateCardT={t.templateCard}
            onSelect={(id) => updateData({ templateId: id })}
            onStyleUrlChange={(url) => updateData({ styleUrl: url })}
            onBack={() => setStep("type")} onContinue={() => setStep("form")} />
        )}

        {step === "form" && data.profileType === "developer" && (
          <DeveloperFormStep data={data} onChange={updateData} t={t.onboarding}
            onBack={() => setStep("template")} onSubmit={() => setStep("generating")} />
        )}

        {step === "form" && data.profileType === "artist" && (
          <ArtistFormStep data={data} onChange={updateData} t={t.onboarding}
            onBack={() => setStep("template")} onSubmit={() => setStep("generating")} />
        )}

        {step === "form" && data.profileType === "fashion" && (
          <FashionFormStep data={data} onChange={updateData} t={t.onboarding}
            onBack={() => setStep("template")} onSubmit={() => setStep("generating")} />
        )}

        {step === "form" && data.profileType === "musicien" && (
          <MusicianFormStep data={data} onChange={updateData} t={t.onboarding}
            onBack={() => setStep("template")} onSubmit={() => setStep("generating")} />
        )}

        {step === "form" && (data.profileType === "other" || data.profileType === "designer" || data.profileType === "photographe") && (
          <ArtistFormStep data={data} onChange={updateData} t={t.onboarding}
            onBack={() => setStep("template")} onSubmit={() => setStep("generating")} />
        )}

        {step === "generating" && (
          <GeneratingStep data={data} t={t.onboarding}
            onDone={(id) => { setGeneratedPortfolioId(id); setStep("share"); }} />
        )}

        {step === "share" && (
          <ShareStep slug={data.slug} t={t.onboarding}
            onContinue={() => router.push(`/portfolio/${generatedPortfolioId}`)} />
        )}
      </div>
    </div>
  );
}
