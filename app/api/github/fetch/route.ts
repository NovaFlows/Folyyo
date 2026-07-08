import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { fetchGitHubData } from "@/lib/github/fetch";

export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const username = request.nextUrl.searchParams.get("username");
  if (!username) return NextResponse.json({ error: "Paramètre username manquant" }, { status: 400 });

  try {
    const githubData = await fetchGitHubData(username);
    return NextResponse.json({ githubData });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
