import { NextRequest, NextResponse } from "next/server";
import { fetchYouTubeData } from "@/lib/youtube/fetch";

export async function GET(request: NextRequest) {
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
