import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { createReview, hasUserReviewed } from "@/lib/db/queries";

const MAX_COMMENT_LENGTH = 2000;

// Soumission d'un avis (popup dashboard). Auth requise, un seul avis par
// compte — voir hasUserReviewed/contrainte UNIQUE(user_id) dans queries.ts.
export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const already = await hasUserReviewed(userId).catch(() => false);
  if (already) {
    return NextResponse.json({ error: "Avis déjà envoyé" }, { status: 409 });
  }

  const { rating, comment } = await request.json().catch(() => ({}));
  const safeRating = Number(rating);
  if (!Number.isInteger(safeRating) || safeRating < 1 || safeRating > 5) {
    return NextResponse.json({ error: "Note invalide" }, { status: 400 });
  }

  const trimmedComment = typeof comment === "string" ? comment.trim().slice(0, MAX_COMMENT_LENGTH) : "";

  // Email capturé côté serveur (Clerk) plutôt que fourni par le client — voir
  // le même choix dans app/api/support/route.ts.
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress ?? user?.emailAddresses?.[0]?.emailAddress ?? "inconnu";

  const review = await createReview({
    user_id: userId,
    email,
    rating: safeRating,
    comment: trimmedComment || null,
  });

  // `review` null uniquement si un avis existait déjà malgré le check plus
  // haut (course rare) — la contrainte UNIQUE a alors simplement ignoré l'insert.
  if (!review) {
    return NextResponse.json({ error: "Avis déjà envoyé" }, { status: 409 });
  }

  return NextResponse.json({ ok: true });
}
