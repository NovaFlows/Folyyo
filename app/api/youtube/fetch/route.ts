import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { fetchYouTubeData } from "@/lib/youtube/fetch";

// Auth manquante jusqu'ici — n'importe quel visiteur non connecté pouvait
// consommer le quota YOUTUBE_API_KEY (partagé par toute l'app) sans limite,
// contrairement à /api/github/fetch qui exige déjà un compte. Alignement sur
// le même comportement.
export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const handle = request.nextUrl.searchParams.get("handle");
  if (!handle) return NextResponse.json({ error: "Paramètre handle manquant" }, { status: 400 });
  const limitParam = request.nextUrl.searchParams.get("limit");
  const limit = limitParam ? Math.min(50, Math.max(1, Number(limitParam) || 10)) : undefined;

  try {
    const youtubeData = await fetchYouTubeData(handle, limit);
    return NextResponse.json({ youtubeData });
  } catch (err) {
    console.error("[youtube/fetch] error:", err);
    const message = (err as Error).message;
    const status = message.includes("introuvable") ? 404 : message.includes("non configurée") ? 500 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
