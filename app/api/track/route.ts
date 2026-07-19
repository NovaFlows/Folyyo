import { NextRequest, NextResponse } from "next/server";
import { logPortfolioView } from "@/lib/db/queries";

// Route PUBLIQUE (pas de auth() — cf middleware.ts, seuls /dashboard,
// /onboarding et /portfolio sont protégés) : reçoit le beacon envoyé par
// CHAQUE portfolio déployé (voir lib/portfolio/code-generator.ts), qui vit
// sur un domaine Vercel différent (*.vercel.app propre par portfolio) — CORS
// ouvert nécessaire. Appelée via navigator.sendBeacon (POST sans body, tout
// en query params) pour éviter le preflight CORS.

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const BOT_UA = /bot|crawler|spider|slurp|facebookexternalhit|whatsapp|telegrambot|discordbot|pingdom|uptimerobot/i;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(request: NextRequest) {
  const ua = request.headers.get("user-agent") ?? "";
  if (BOT_UA.test(ua)) return new NextResponse(null, { status: 204, headers: CORS_HEADERS });

  const portfolioId = request.nextUrl.searchParams.get("p");
  if (!portfolioId || !UUID_RE.test(portfolioId)) {
    return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
  }
  const referrer = request.nextUrl.searchParams.get("r") || null;

  try {
    await logPortfolioView(portfolioId, referrer);
  } catch (err) {
    // Portfolio inexistant/supprimé, ou erreur DB transitoire — jamais
    // remonté au site déployé, uniquement loggé côté serveur.
    console.error("[track] error:", err);
  }

  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
