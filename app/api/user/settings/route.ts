import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getUserSettings, upsertUserSettings } from "@/lib/db/queries";
import { languageForCountry } from "@/lib/i18n/country-language";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const settings = await getUserSettings(userId);
  return NextResponse.json({ country: settings?.country ?? null, language: settings?.language ?? "fr" });
}

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { country, language } = await request.json() as { country?: string; language?: "fr" | "en" | "es" };
  if (!country && !language) {
    return NextResponse.json({ error: "country ou language requis" }, { status: 400 });
  }

  // Un pays fourni sans langue explicite dérive la langue automatiquement
  // (même logique qu'à la génération) — pays non supporté → anglais.
  const resolvedLanguage = language ?? (country ? (languageForCountry(country) ?? "en") : undefined);

  const settings = await upsertUserSettings(userId, { country, language: resolvedLanguage });
  return NextResponse.json({ country: settings.country, language: settings.language });
}
