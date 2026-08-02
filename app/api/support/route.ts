import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { createSupportMessage, countRecentSupportMessages } from "@/lib/db/queries";
import { notifyNewSupportMessage } from "@/lib/email/notify";

const CATEGORIES = new Set(["bug", "suggestion", "other"]);
const MAX_MESSAGE_LENGTH = 5000;
const RATE_LIMIT_PER_HOUR = 5;

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  // Anti-spam : un compte authentifié pouvait sinon spammer indéfiniment
  // l'e-mail de l'exploitant (un envoi Resend par message créé).
  const recentCount = await countRecentSupportMessages(userId, 1).catch(() => 0);
  if (recentCount >= RATE_LIMIT_PER_HOUR) {
    return NextResponse.json({ error: "Trop de messages envoyés, réessaie dans une heure." }, { status: 429 });
  }

  const { category, message } = await request.json().catch(() => ({}));
  const trimmed = typeof message === "string" ? message.trim() : "";
  if (!trimmed) return NextResponse.json({ error: "Message requis" }, { status: 400 });

  const safeCategory = CATEGORIES.has(category) ? category : "other";

  // Email capturé côté serveur (Clerk) plutôt que fourni par le client — reste
  // exact même si la personne change d'adresse plus tard, et ne peut pas être usurpé.
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress ?? user?.emailAddresses?.[0]?.emailAddress ?? "inconnu";

  const saved = trimmed.slice(0, MAX_MESSAGE_LENGTH);
  await createSupportMessage({
    user_id: userId,
    email,
    category: safeCategory,
    message: saved,
  });

  // Notification e-mail à l'exploitant (best-effort — ne bloque pas la réponse
  // à l'utilisateur si l'envoi échoue).
  await notifyNewSupportMessage({ email, category: safeCategory, message: saved });

  return NextResponse.json({ ok: true });
}
