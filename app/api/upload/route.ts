import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { putFile, keys } from "@/lib/r2/client";
import { writeCvLocal, IS_DEV } from "@/lib/dev-storage";

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const formData = await request.formData();
  const cvFile = formData.get("cv") as File | null;

  if (!cvFile) return NextResponse.json({ error: "Fichier CV manquant" }, { status: 400 });
  if (cvFile.type !== "application/pdf") return NextResponse.json({ error: "Format PDF requis" }, { status: 400 });
  if (cvFile.size > 10 * 1024 * 1024) return NextResponse.json({ error: "Fichier trop grand (max 10 MB)" }, { status: 400 });

  const portfolioId = `tmp-${Date.now()}`;
  const cvKey = keys.cv(userId, portfolioId);
  const buffer = Buffer.from(await cvFile.arrayBuffer());

  if (IS_DEV) {
    // Local dev: write to temp dir instead of R2 (R2 has TLS issues on local Windows)
    writeCvLocal(cvKey, buffer);
    return NextResponse.json({ cvStoragePath: `local:${cvKey}` });
  }

  try {
    await putFile(cvKey, buffer, "application/pdf");
  } catch (err) {
    console.error("[upload] R2 error:", err);
    return NextResponse.json({ error: `Erreur R2: ${(err as Error).message}` }, { status: 500 });
  }

  return NextResponse.json({ cvStoragePath: cvKey });
}
