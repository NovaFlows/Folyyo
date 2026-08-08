import type { Metadata } from "next";
import DashboardShell from "@/app/(dashboard)/DashboardShell";
import { assertLocalOnly, shotLocale, SHOT_DEFAULT_USER_ID } from "../config";
import ShotOnboarding, { type ShotStep, type ShotProfile } from "./ShotOnboarding";

// Jamais prérendu au build (sinon Next tenterait un accès Neon au moment du
// build) et jamais mis en cache — voir app/shot/config.ts pour le mode d'emploi.
export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };

// Alias tolérés côté URL → nom d'étape réel du composant d'onboarding.
const STEPS: Record<string, ShotStep> = {
  country: "country", pays: "country",
  profile: "type", type: "type", metier: "type",
  template: "template", style: "template",
  form: "form", infos: "form", formulaire: "form",
  generating: "generating", generation: "generating",
  share: "share", partage: "share",
};

const PROFILES: Record<string, ShotProfile> = {
  developer: "developer", dev: "developer", it: "developer",
  designer: "designer",
  photographe: "photographe", photographer: "photographe", photo: "photographe",
  artist: "artist", artiste: "artist",
  fashion: "fashion", mode: "fashion", mannequin: "fashion",
  musicien: "musicien", musician: "musicien", musique: "musicien",
  other: "other", autre: "other",
};

// Capture de l'onboarding, étape par étape, sans session Clerk (la vraie route
// /onboarding est protégée par le middleware ET par un layout qui fait auth() +
// une garde « un portfolio par compte »). Les appels API qui exigent une session
// ou qui écriraient en base sont bouchonnés côté client — voir ShotOnboarding.
//
//   /shot/onboarding?step=country
//   /shot/onboarding?step=profile            (aucun métier sélectionné)
//   /shot/onboarding?step=profile&profile=developer   (carte IT sélectionnée)
//   /shot/onboarding?step=template&profile=developer
//   /shot/onboarding?step=form&profile=musicien
//   /shot/onboarding?step=generating&profile=developer&gstep=2
//   /shot/onboarding?step=share&profile=developer
//
// Options communes : ?locale=fr|en|es|de (langue de l'interface),
// ?chrome=0 (sans la barre de navigation du dashboard, étape isolée),
// ?empty=1 (champs vides, pour la frame « avant saisie »),
// ?country=BE (pays présélectionné à l'étape pays),
// ?gstep=0..3 (ligne du terminal sur laquelle figer l'écran de génération).
export default function ShotOnboardingPage({
  searchParams,
}: {
  searchParams: { step?: string; profile?: string; locale?: string; gstep?: string; chrome?: string; empty?: string; country?: string };
}) {
  assertLocalOnly();

  const locale = shotLocale(searchParams.locale);
  const step = STEPS[(searchParams.step ?? "").toLowerCase()] ?? "type";
  // Absent = aucune carte sélectionnée sur l'étape « métier » ; les étapes
  // suivantes retombent alors sur le profil développeur.
  const profile = PROFILES[(searchParams.profile ?? "").toLowerCase()] ?? null;
  const gstep = Number.isFinite(Number(searchParams.gstep)) && searchParams.gstep ? Number(searchParams.gstep) : 2;

  const inner = (
    <ShotOnboarding
      step={step}
      profile={step === "type" ? profile : (profile ?? "developer")}
      locale={locale}
      gstep={gstep}
      empty={searchParams.empty === "1"}
      country={searchParams.country || "FR"}
    />
  );

  // Par défaut on reproduit ce que voit vraiment l'utilisateur : l'onboarding
  // est rendu à l'intérieur du layout du dashboard, donc sous sa barre de nav.
  if (searchParams.chrome === "0") return inner;
  return <DashboardShell userId={SHOT_DEFAULT_USER_ID} locale={locale}>{inner}</DashboardShell>;
}
