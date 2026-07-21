import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { createSupportMessage } from "@/lib/db/queries";

const CATEGORIES = new Set(["bug", "suggestion", "other"]);
const MAX_MESSAGE_LENGTH = 5000;

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { category, message } = await request.json().catch(() => ({}));
  const trimmed = typeof message === "string" ? message.trim() : "";
  if (!trimmed) return NextResponse.json({ error: "Message requis" }, { status: 400 });

  const safeCategory = CATEGORIES.has(category) ? category : "other";

  // Email capturé côté serveur (Clerk) plutôt que fourni par le client — reste
  // exact même si la personne change d'adresse plus tard, et ne peut pas être usurpé.
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress ?? user?.emailAddresses?.[0]?.emailAddress ?? "inconnu";

  await createSupportMessage({
    user_id: userId,
    email,
    category: safeCategory,
    message: trimmed.slice(0, MAX_MESSAGE_LENGTH),
  });

  return NextResponse.json({ ok: true });
}
