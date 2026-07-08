import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { deletePortfolio, updatePortfolioJsonAndCode } from "@/lib/db/queries";
import { PortfolioJSONSchema } from "@/lib/anthropic/schema";
import { generateDeveloperCode } from "@/lib/portfolio/code-generator";
import fs from "fs";
import path from "path";
import os from "os";

const IS_DEV = process.env.NODE_ENV === "development";

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
  const newCode  = generateDeveloperCode(siteJson);
  const codeKey  = `source-code/${params.id}/portfolio.json`;

  let savedKey = codeKey;
  if (IS_DEV) {
    const dir = path.join(os.tmpdir(), "folyyo-source");
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, codeKey.replace(/\//g, "_")), JSON.stringify(newCode));
    savedKey = `local:${codeKey}`;
  } else {
    const { putJson } = await import("@/lib/r2/client");
    await putJson(codeKey, newCode);
  }

  await updatePortfolioJsonAndCode(params.id, siteJson, savedKey);
  return NextResponse.json({ ok: true });
}
