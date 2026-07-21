import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";

// Désactivation réversible (par opposition à la suppression définitive,
// voir /api/user/delete) : verrouille le compte Clerk (bloque les futures
// connexions) sans toucher aux données. Seul un contact support peut le
// déverrouiller pour l'instant — pas de self-service de réactivation.
export async function POST() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  try {
    await clerkClient().users.lockUser(userId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[user/deactivate] error:", err);
    return NextResponse.json({ error: "Impossible de désactiver le compte" }, { status: 500 });
  }
}
