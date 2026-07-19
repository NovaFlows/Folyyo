import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { deletePortfolio, updatePortfolioJsonAndCode, getPortfolioById } from "@/lib/db/queries";
import { PortfolioJSONSchema } from "@/lib/anthropic/schema";
import { generateDeveloperCode } from "@/lib/portfolio/code-generator";
import { writeSourceCode } from "@/lib/dev-storage";
import { keys } from "@/lib/r2/client";

// Statut du portfolio — utilisé par PortfolioEditor pour savoir si une édition IA
// est encore en cours (barre de chargement persistante après un refresh).
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const portfolio = await getPortfolioById(params.id, userId);
  if (!portfolio) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return NextResponse.json({ status: portfolio.status });
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  await deletePortfolio(params.id, userId);
  return NextResponse.json({ ok: true });
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const body = await request.json();
  const parsed = PortfolioJSONSchema.safeParse(body.siteJson);
  if (!parsed.success) {
    return NextResponse.json({ error: "JSON invalide", details: parsed.error.flatten() }, { status: 400 });
  }

  const siteJson = parsed.data;
  const newCode  = generateDeveloperCode(siteJson, params.id);
  const codeKey  = keys.sourceCode(params.id);
  const savedKey = await writeSourceCode(codeKey, newCode);

  await updatePortfolioJsonAndCode(params.id, siteJson, savedKey);
  return NextResponse.json({ ok: true });
}
