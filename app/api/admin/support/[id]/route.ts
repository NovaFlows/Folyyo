import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { isAdmin } from "@/lib/auth/admin";
import { setSupportMessageStatus } from "@/lib/db/queries";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const { userId } = await auth();
  if (!isAdmin(userId)) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  const { status } = await request.json().catch(() => ({}));
  await setSupportMessageStatus(params.id, status === "resolved" ? "resolved" : "new");

  return NextResponse.json({ ok: true });
}
