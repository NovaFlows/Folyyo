"use client";

import { useCallback, useEffect, useState } from "react";
import { getDictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/types";
import LanguageToggle from "@/components/i18n/LanguageToggle";
import CountryStep from "@/app/(dashboard)/onboarding/_steps/CountryStep";
import ProfileTypeStep from "@/app/(dashboard)/onboarding/_steps/ProfileTypeStep";
import TemplatePickerStep from "@/app/(dashboard)/onboarding/_steps/TemplatePickerStep";
import DeveloperFormStep from "@/app/(dashboard)/onboarding/_steps/DeveloperFormStep";
import ArtistFormStep from "@/app/(dashboard)/onboarding/_steps/ArtistFormStep";
import FashionFormStep from "@/app/(dashboard)/onboarding/_steps/FashionFormStep";
import MusicianFormStep from "@/app/(dashboard)/onboarding/_steps/MusicianFormStep";
import GeneratingStep from "@/app/(dashboard)/onboarding/_steps/GeneratingStep";
import ShareStep from "@/app/(dashboard)/onboarding/_steps/ShareStep";
import type { OnboardingData } from "@/app/(dashboard)/onboarding/page";

export type ShotStep = "country" | "type" | "template" | "form" | "generating" | "share";
export type ShotProfile = NonNullable<OnboardingData["profileType"]>;

// ─────────────────────────────────────────────────────────────────────────────
// Données de démo — l'objectif des captures étant une démo vendeuse, aucun
// champ ne doit apparaître vide. Une persona par famille de profil, avec des
// comptes sociaux plausibles (jamais appelés : les API sont bouchonnées
// ci-dessous).
// ─────────────────────────────────────────────────────────────────────────────
const DEMO_BY_PROFILE: Record<ShotProfile, Partial<OnboardingData>> = {
  developer: {
    name: "Camille Fontaine", title: "Développeuse Fullstack", email: "camille@fontaine.dev",
    slug: "camille-fontaine", githubUsername: "camillefontaine",
    linkedinUrl: "linkedin.com/in/camillefontaine", twitterUrl: "@camillefnt",
  },
  designer: {
    name: "Camille Fontaine", title: "Directrice artistique", email: "camille@studio-fontaine.fr",
    slug: "camille-fontaine", instagramHandle: "camille.studio",
    linkedinUrl: "linkedin.com/in/camillefontaine", websiteUrl: "studio-fontaine.fr",
  },
  photographe: {
    name: "Julien Basset", title: "Photographe portrait & mariage", email: "contact@julienbasset.fr",
    slug: "julien-basset", instagramHandle: "julienbasset.photo",
    linkedinUrl: "linkedin.com/in/julienbasset", websiteUrl: "julienbasset.fr",
  },
  artist: {
    name: "Léa Moreau", title: "Illustratrice & peintre", email: "hello@leamoreau.art",
    slug: "lea-moreau", instagramHandle: "lea.moreau.art",
    linkedinUrl: "linkedin.com/in/leamoreau", websiteUrl: "leamoreau.art",
  },
  fashion: {
    name: "Inès Karim", title: "Mannequin — Paris / Milan", email: "ines.karim@booking.fr",
    slug: "ines-karim", instagramHandle: "ineskarim",
    linkedinUrl: "linkedin.com/in/ineskarim",
  },
  musicien: {
    name: "Théo Rivière", title: "Producteur & compositeur", email: "booking@theoriviere.fr",
    slug: "theo-riviere", youtubeHandle: "theoriviere", instagramHandle: "theo.riviere",
    linkedinUrl: "linkedin.com/in/theoriviere",
  },
  other: {
    name: "Camille Fontaine", title: "Consultante indépendante", email: "camille@fontaine.pro",
    slug: "camille-fontaine", linkedinUrl: "linkedin.com/in/camillefontaine",
    websiteUrl: "fontaine.pro",
  },
};

const EMPTY_DATA: OnboardingData = {
  profileType: null, templateId: null, styleUrl: "", slug: "", name: "", title: "", email: "", country: "",
  githubUsername: "", instagramHandle: "", youtubeHandle: "", linkedinUrl: "", twitterUrl: "", websiteUrl: "", cvFile: null,
};

function demoData(profile: ShotProfile | null, empty: boolean, country: string): OnboardingData {
  if (empty) return { ...EMPTY_DATA, profileType: profile, country: "" };
  return { ...EMPTY_DATA, ...(profile ? DEMO_BY_PROFILE[profile] : {}), profileType: profile, country };
}

// Faux CV pour que la zone de dépôt affiche « ✓ cv-…pdf » plutôt que l'invite
// vide. Jamais uploadé (l'appel à /api/upload est bouchonné).
function demoCv(profile: ShotProfile | null): File | null {
  if (typeof File === "undefined" || !profile || profile === "musicien") return null;
  const slug = DEMO_BY_PROFILE[profile].slug ?? "demo";
  return new File([new Uint8Array([0x25, 0x50, 0x44, 0x46])], `cv-${slug}.pdf`, { type: "application/pdf" });
}

// ─────────────────────────────────────────────────────────────────────────────
// Bouchon réseau. Les étapes appellent de vraies routes API qui exigent une
// session Clerk (upload, génération) ou écrivent en base — impossible ici, et
// de toute façon indésirable pour une capture. On intercepte donc les seuls
// appels problématiques ; tout le reste (notamment /api/community/featured, qui
// alimente le sélecteur de template avec les VRAIS portfolios) passe au réseau.
//
// `gstep` fige l'écran de génération sur une ligne précise du terminal : l'appel
// correspondant à l'étape suivante ne se résout jamais, donc l'animation
// s'arrête là. Correspondance (voir _steps/GeneratingStep.tsx) :
//   parcours standard  0 upload cv.pdf · 1 fetch github/analyse · 2 generate · 3 build
//   parcours musicien  0 fetch youtube · 1 generate · 2 build
// ─────────────────────────────────────────────────────────────────────────────
function installFetchStub(profile: ShotProfile | null, gstep: number) {
  const real = window.fetch.bind(window);
  const never = () => new Promise<Response>(() => {});
  const json = (body: unknown) =>
    Promise.resolve(new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } }));
  const musicien = profile === "musicien";

  window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;

    // Toujours « disponible » : évite un ✗ rouge sur un slug déjà pris en base.
    if (url.includes("/api/portfolio/check-slug")) return json({ available: true });
    if (url.includes("/api/user/settings")) return json({});
    if (url.includes("/api/upload")) return gstep <= 0 ? never() : json({ cvStoragePath: "shot/demo-cv.pdf" });
    if (url.includes("/api/youtube/fetch")) return gstep <= 0 ? never() : json({ youtubeData: {} });
    if (url.includes("/api/github/fetch")) return gstep <= 1 ? never() : json({ githubData: {} });
    if (url.includes("/api/portfolio/generate")) return gstep <= (musicien ? 1 : 2) ? never() : json({ portfolioId: "shot-demo" });

    return real(input as RequestInfo, init);
  }) as typeof window.fetch;
}

interface Props {
  step: ShotStep;
  profile: ShotProfile | null;   // null = aucun métier présélectionné
  locale: Locale;
  gstep: number;
  empty: boolean;
  country: string;
}

export default function ShotOnboarding({ step: initialStep, profile, locale: initialLocale, gstep, empty, country }: Props) {
  const [locale, setLocale] = useState<Locale>(initialLocale);
  const t = getDictionary(locale);
  const STEP_LABELS = t.onboarding.stepLabels;

  const [step, setStep] = useState<ShotStep>(initialStep);
  const [data, setData] = useState<OnboardingData>(() => demoData(profile, empty, country));
  const [ready, setReady] = useState(false);

  // Rien n'est rendu avant ce montage : le bouchon réseau doit être en place
  // avant les effets des étapes, et le faux CV ne peut être construit que côté
  // navigateur (pas de `File` au rendu serveur → écart d'hydratation).
  useEffect(() => {
    installFetchStub(profile, gstep);
    if (!empty) setData((prev) => ({ ...prev, cvFile: demoCv(profile) }));
    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateData = useCallback((partial: Partial<OnboardingData>) => {
    setData((prev) => ({ ...prev, ...partial }));
  }, []);

  // Identité stable : GeneratingStep relance sa séquence à chaque changement
  // de `onDone`. Ici on ne redirige pas — la capture reste sur le terminal.
  const noopDone = useCallback(() => {}, []);

  if (!ready) return null;

  const stepIndex = { country: -1, type: 0, template: 1, form: 2, generating: 3, share: 3 }[step];
  // Le métier gouverne le formulaire affiché ; sur l'étape « type » il peut
  // rester nul (aucune carte sélectionnée), d'où le repli sur "developer".
  const formProfile = data.profileType ?? "developer";

  return (
    // Habillage identique à app/(dashboard)/onboarding/page.tsx — à
    // resynchroniser si celui-ci change.
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12" style={{ background: "#f8f5f0" }}>
      <div className="fixed right-6 top-6">
        <LanguageToggle locale={locale} onChange={setLocale} />
      </div>
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
            onChange={(c) => updateData({ country: c })}
            onContinue={() => setStep("type")} />
        )}

        {step === "type" && (
          <ProfileTypeStep selected={data.profileType} t={t.onboarding}
            onSelect={(type) => { updateData({ profileType: type }); setStep("template"); }} />
        )}

        {step === "template" && (
          <TemplatePickerStep profileType={formProfile} templateId={data.templateId} styleUrl={data.styleUrl}
            t={t.onboarding} templateCardT={t.templateCard}
            onSelect={(id) => updateData({ templateId: id })}
            onStyleUrlChange={(url) => updateData({ styleUrl: url })}
            onBack={() => setStep("type")} onContinue={() => setStep("form")} />
        )}

        {step === "form" && formProfile === "developer" && (
          <DeveloperFormStep data={data} onChange={updateData} t={t.onboarding}
            onBack={() => setStep("template")} onSubmit={() => setStep("generating")} />
        )}

        {step === "form" && formProfile === "fashion" && (
          <FashionFormStep data={data} onChange={updateData} t={t.onboarding}
            onBack={() => setStep("template")} onSubmit={() => setStep("generating")} />
        )}

        {step === "form" && formProfile === "musicien" && (
          <MusicianFormStep data={data} onChange={updateData} t={t.onboarding}
            onBack={() => setStep("template")} onSubmit={() => setStep("generating")} />
        )}

        {/* artist / designer / photographe / other partagent le même formulaire */}
        {step === "form" && (formProfile === "artist" || formProfile === "designer" || formProfile === "photographe" || formProfile === "other") && (
          <ArtistFormStep data={data} onChange={updateData} t={t.onboarding}
            onBack={() => setStep("template")} onSubmit={() => setStep("generating")} />
        )}

        {step === "generating" && (
          <GeneratingStep data={{ ...data, profileType: formProfile }} t={t.onboarding} onDone={noopDone} />
        )}

        {step === "share" && (
          <ShareStep slug={data.slug || "demo"} t={t.onboarding} onContinue={noopDone} />
        )}
      </div>
    </div>
  );
}
