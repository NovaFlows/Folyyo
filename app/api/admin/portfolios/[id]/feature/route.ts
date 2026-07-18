import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { isAdmin } from "@/lib/auth/admin";
import { setPortfolioFeatured } from "@/lib/db/queries";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const { userId } = await auth();
  if (!isAdmin(userId)) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  const { featured } = await request.json();
  await setPortfolioFeatured(params.id, Boolean(featured));
  return NextResponse.json({ ok: true });
}
