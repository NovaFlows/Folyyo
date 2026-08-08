import { NextRequest, NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { getTrialEmailCandidates, markTrialEmailRelanceSent, markTrialEmailJ3Sent } from "@/lib/db/queries";
import { sendTrialReminderEmail, sendTrialLastDayEmail } from "@/lib/email/notify";

export const maxDuration = 60;

const DAY_MS = 24 * 60 * 60 * 1000;

// ─────────────────────────────────────────────────────────────────────────────
// Cron quotidien (voir vercel.json — plan Vercel Hobby : une exécution/jour
// maximum, pas d'hebdomadaire plus fin possible sans passer Pro) — deux
// e-mails de la séquence d'essai (le J0 part directement depuis
// /api/portfolio/generate) :
//   relance      : 24h-48h après le début de l'essai (24h < temps restant <= 48h)
//   dernier jour : dans les 24 dernières heures (temps restant <= 24h)
// Fenêtres larges de 24h exprès : avec un passage par jour, chaque compte est
// garanti de tomber au moins une fois dans chacune, même si l'heure exacte du
// cron varie légèrement d'un jour à l'autre. Idempotent via
// trial_email_relance_sent_at / trial_email_j3_sent_at.
//
// Protégée par le header standard Vercel Cron (Authorization: Bearer
// $CRON_SECRET) — sans CRON_SECRET configuré, la route refuse tout appel
// plutôt que de tourner "ouverte".
// ─────────────────────────────────────────────────────────────────────────────
function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const candidates = await getTrialEmailCandidates();
  if (candidates.length === 0) return NextResponse.json({ scanned: 0, sent: 0 });

  // Un seul aller-retour Clerk groupé plutôt qu'un appel par utilisateur.
  const users = await clerkClient().users.getUserList({ userId: candidates.map((c) => c.user_id), limit: candidates.length });
  const emailByUserId = new Map(
    users.data.map((u) => [u.id, u.primaryEmailAddress?.emailAddress ?? u.emailAddresses[0]?.emailAddress ?? null]),
  );

  let sent = 0;
  for (const c of candidates) {
    const to = emailByUserId.get(c.user_id);
    if (!to) continue;

    const msLeft = new Date(c.trial_ends_at).getTime() - Date.now();
    if (msLeft <= 0) continue; // essai déjà expiré — plus rien à envoyer ici

    try {
      if (msLeft <= DAY_MS) {
        if (c.trial_email_j3_sent_at) continue;
        await sendTrialLastDayEmail({ to, locale: c.language, slug: c.slug, views: c.views });
        await markTrialEmailJ3Sent(c.user_id);
        sent++;
      } else if (msLeft <= 2 * DAY_MS) {
        if (c.trial_email_relance_sent_at) continue;
        await sendTrialReminderEmail({ to, locale: c.language, slug: c.slug, views: c.views });
        await markTrialEmailRelanceSent(c.user_id);
        sent++;
      }
    } catch (err) {
      // Un échec isolé (Resend en panne, etc.) ne doit pas empêcher le
      // traitement des autres comptes de ce passage.
      console.error("[cron/trial-emails] échec pour", c.user_id, (err as Error).message);
    }
  }

  return NextResponse.json({ scanned: candidates.length, sent });
}
