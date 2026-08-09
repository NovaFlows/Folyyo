// Notifications e-mail : à l'exploitant (nouvel abonné, support — section du
// haut) ET à un client, séquence d'essai 3 jours (section du bas, voir
// sendTrialLiveEmail/sendTrialReminderEmail/sendTrialLastDayEmail — déclenchées
// depuis /api/portfolio/generate et app/api/cron/trial-emails).
//
// Envoi via l'API HTTP de Brevo (aucune dépendance ajoutée — simple fetch).
//
// Pourquoi Brevo et pas Resend : le compte Resend de l'exploitant héberge déjà
// washboard.fr, et le plan gratuit n'autorise qu'UN domaine par équipe (créer
// une seconde équipe impose un plan payant). Envoyer les e-mails Folyo depuis
// washboard.fr aurait dérouté les destinataires. Brevo permet de vérifier
// folyo.page sur son offre gratuite, avec un quota plus large (300/jour contre
// 3 000/mois), et laisse WashBoard sur Resend sans interférence.
//
// Conçu pour ne JAMAIS interrompre le flux appelant : si la clé est absente ou
// si l'appel échoue, on journalise et on retourne sans lever d'exception (un
// webhook Stripe doit répondre 200 même si l'e-mail échoue).

import { SITE_URL } from "@/lib/seo";
import type { Locale } from "@/lib/i18n/types";

const BREVO_ENDPOINT = "https://api.brevo.com/v3/smtp/email";

// Adresse qui reçoit les notifications (par défaut l'e-mail de l'exploitant).
function adminEmail(): string {
  return process.env.ADMIN_NOTIFY_EMAIL || "novaflows.pro@gmail.com";
}

// Expéditeur, au format "Nom <adresse>" ou simple adresse. Le domaine doit être
// vérifié dans Brevo, sinon l'envoi est refusé.
function fromAddress(): { name: string; email: string } {
  const raw = process.env.EMAIL_FROM || "Folyo <notifications@folyo.page>";
  const m = raw.match(/^\s*(.*?)\s*<\s*([^>]+?)\s*>\s*$/);
  // `.trim()` sur l'adresse : un espace résiduel avant le `>` suffirait à
  // faire rejeter l'envoi par Brevo.
  return m ? { name: m[1] || "Folyo", email: m[2].trim() } : { name: "Folyo", email: raw.trim() };
}

// Transport bas niveau, partagé par les notifications admin ET les e-mails
// client (séquence d'essai) — seul le destinataire change. Ne lève jamais :
// un webhook Stripe ou une génération de portfolio doit répondre normalement
// même si le fournisseur d'e-mail est mal configuré ou indisponible.
async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const key = process.env.BREVO_API_KEY;
  if (!key) {
    console.warn("[email] BREVO_API_KEY absente — email ignoré:", subject);
    return;
  }
  if (!to) {
    console.warn("[email] destinataire manquant — email ignoré:", subject);
    return;
  }
  try {
    const res = await fetch(BREVO_ENDPOINT, {
      method: "POST",
      // Brevo attend la clé dans l'en-tête `api-key`, pas en Bearer.
      headers: { "api-key": key, "Content-Type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        sender: fromAddress(),
        to: [{ email: to }],
        subject,
        htmlContent: html,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error("[email] échec d'envoi:", res.status, body.slice(0, 300));
    }
  } catch (err) {
    console.error("[email] erreur réseau:", (err as Error).message);
  }
}

async function sendAdminEmail(subject: string, html: string): Promise<void> {
  await sendEmail(adminEmail(), subject, html);
}

// Gabarit sobre, cohérent avec l'identité Folyo (crème + serif), lisible sur mobile.
function shell(title: string, rows: Array<[string, string]>, note?: string): string {
  const cells = rows
    .map(
      ([k, v]) =>
        `<tr><td style="padding:6px 0;color:#78716c;font-size:13px;white-space:nowrap;vertical-align:top">${k}</td>` +
        `<td style="padding:6px 0 6px 16px;color:#1c1917;font-size:14px">${v}</td></tr>`
    )
    .join("");
  return `<!doctype html><html><body style="margin:0;background:#f8f5f0;padding:24px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
  <div style="max-width:480px;margin:0 auto;background:#fff;border:1px solid rgba(0,0,0,.07);border-radius:16px;overflow:hidden">
    <div style="padding:20px 24px;border-bottom:1px solid rgba(0,0,0,.06)">
      <span style="font-family:'Playfair Display',Georgia,serif;font-size:18px;color:#1c1917">folyo</span>
    </div>
    <div style="padding:24px">
      <h1 style="margin:0 0 16px;font-size:17px;color:#1c1917;font-weight:600">${title}</h1>
      <table style="width:100%;border-collapse:collapse">${cells}</table>
      ${note ? `<p style="margin:20px 0 0;padding:14px;background:#f0ece6;border-radius:10px;color:#57534e;font-size:13px;line-height:1.5">${note}</p>` : ""}
    </div>
  </div>
</body></html>`;
}

function esc(s: string): string {
  return (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Appelé depuis le webhook Stripe à la validation d'un nouvel abonnement payé.
export async function notifyNewSubscription(info: {
  email: string;
  plan: string; // "Mensuel" | "Annuel" | ""
  amount: string; // ex. "5,99 EUR"
  userId: string;
}): Promise<void> {
  const rows: Array<[string, string]> = [
    ["Client", esc(info.email || "inconnu")],
    ["Formule", esc([info.plan, info.amount].filter(Boolean).join(" — ")) || "abonnement"],
    ["ID Clerk", esc(info.userId)],
    ["Date", new Date().toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" })],
  ];
  const subject = `Nouvel abonné Folyo${info.plan ? " (" + info.plan + ")" : ""} — ${info.email || "client"}`;
  await sendAdminEmail(subject, shell("Nouvel abonnement", rows));
}

// Appelé depuis /api/support à la création d'un message (statut « new » = en attente admin).
export async function notifyNewSupportMessage(info: {
  email: string;
  category: string;
  message: string;
}): Promise<void> {
  const labels: Record<string, string> = { bug: "Bug", suggestion: "Suggestion", other: "Autre" };
  const cat = labels[info.category] || "Autre";
  const preview = info.message.length > 500 ? info.message.slice(0, 500) + "…" : info.message;
  const rows: Array<[string, string]> = [
    ["De", esc(info.email || "inconnu")],
    ["Catégorie", cat],
    ["Date", new Date().toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" })],
  ];
  const subject = `Nouveau message ${cat} — ${info.email || "utilisateur"}`;
  const note = `<strong style="color:#1c1917">Message :</strong><br>${esc(preview).replace(/\n/g, "<br>")}<br><br>À traiter dans l'admin (statut « en attente »).`;
  await sendAdminEmail(subject, shell("Nouveau message de support", rows, note));
}

// ─────────────────────────────────────────────────────────────────────────────
// Séquence e-mail d'essai (3 jours) — destinataire = le CLIENT. Trois étapes,
// ancrées sur trial_ends_at (voir lib/billing/access.ts) :
//   J0      → à la génération du portfolio, déclenché depuis
//             app/api/portfolio/generate/route.ts
//   relance → J1-J2, via app/api/cron/trial-emails (Vercel Cron)
//   dernier jour → J3, via le même cron, lien DIRECT vers le paiement
// Idempotence : colonnes trial_email_*_sent_at (lib/db/queries.ts) — chaque
// e-mail n'est envoyé qu'une fois par compte.
// ─────────────────────────────────────────────────────────────────────────────

function portfolioUrl(slug: string): string {
  return `${SITE_URL}/${slug}`;
}

// /billing lit ce paramètre et lance immédiatement le Checkout Stripe mensuel
// (voir BillingPageClient.tsx) — pas un clic de plus entre l'e-mail d'urgence
// et le paiement.
function checkoutUrl(): string {
  return `${SITE_URL}/billing?checkout=monthly`;
}

function ctaButton(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;margin-top:14px;padding:11px 20px;background:#1c1917;color:#f8f5f0;border-radius:10px;text-decoration:none;font-size:13px;font-weight:600">${esc(label)} →</a>`;
}

// ── J0 — "ton portfolio est en ligne" ───────────────────────────────────────

const J0_COPY: Record<Locale, { subject: string; title: string; linkLabel: string; trialLabel: string; note: string }> = {
  fr: {
    subject: "Ton portfolio est en ligne",
    title: "Ton portfolio est en ligne",
    linkLabel: "Ton lien",
    trialLabel: "Essai gratuit",
    note: "Il te reste 3 jours d'essai. Partage ton lien dès maintenant — sur LinkedIn, en bio Instagram, ou simplement par message : plus vite il est vu, plus vite tu sauras s'il vaut la peine d'être gardé.",
  },
  en: {
    subject: "Your portfolio is live",
    title: "Your portfolio is live",
    linkLabel: "Your link",
    trialLabel: "Free trial",
    note: "You have 3 days left on your trial. Share your link right now — on LinkedIn, your Instagram bio, or just a message: the sooner it's seen, the sooner you'll know it's worth keeping.",
  },
  es: {
    subject: "Tu portfolio ya está online",
    title: "Tu portfolio ya está online",
    linkLabel: "Tu enlace",
    trialLabel: "Prueba gratuita",
    note: "Te quedan 3 días de prueba. Comparte tu enlace ahora mismo — en LinkedIn, en tu bio de Instagram o por mensaje: cuanto antes lo vean, antes sabrás si merece la pena conservarlo.",
  },
  de: {
    subject: "Dein Portfolio ist online",
    title: "Dein Portfolio ist online",
    linkLabel: "Dein Link",
    trialLabel: "Kostenlose Testphase",
    note: "Du hast noch 3 Tage Testphase. Teile deinen Link jetzt — auf LinkedIn, in deiner Instagram-Bio oder einfach per Nachricht: Je früher er gesehen wird, desto schneller weißt du, ob es sich lohnt.",
  },
};

// Appelé depuis /api/portfolio/generate juste après setPortfolioReady.
export async function sendTrialLiveEmail(info: { to: string; locale: Locale; slug: string; trialEndsAt: string }): Promise<void> {
  const c = J0_COPY[info.locale] ?? J0_COPY.fr;
  const url = portfolioUrl(info.slug);
  const endDate = new Date(info.trialEndsAt).toLocaleDateString(info.locale, { day: "numeric", month: "long" });
  const rows: Array<[string, string]> = [
    [c.linkLabel, `<a href="${url}" style="color:#1c1917">${esc(url)}</a>`],
    [c.trialLabel, endDate],
  ];
  await sendEmail(info.to, c.subject, shell(c.title, rows, c.note));
}

// ── Relance J1-J2 — personnalisée par le nombre de vues ─────────────────────

const RELANCE_COPY: Record<Locale, { subject: string; title: string; linkLabel: string; viewsLabel: string; noteZero: string; notePositive: (n: number) => string }> = {
  fr: {
    subject: "Ton portfolio a besoin d'un coup de pouce",
    title: "Encore 2 jours d'essai",
    linkLabel: "Ton lien",
    viewsLabel: "Vues",
    noteZero: "Personne n'a encore vu ton portfolio. Partage-le dès maintenant sur LinkedIn ou en story Instagram — un lien qui dort ne convainc personne.",
    notePositive: (n) => `${n} personne${n > 1 ? "s ont" : " a"} déjà vu ton portfolio. Continue à le partager pour aller plus loin — chaque nouvelle vue te rapproche d'une opportunité.`,
  },
  en: {
    subject: "Your portfolio could use a push",
    title: "2 days left on your trial",
    linkLabel: "Your link",
    viewsLabel: "Views",
    noteZero: "Nobody has seen your portfolio yet. Share it now on LinkedIn or your Instagram story — a link nobody sees convinces nobody.",
    notePositive: (n) => `${n} ${n > 1 ? "people have" : "person has"} already seen your portfolio. Keep sharing to go further — every new view brings you closer to an opportunity.`,
  },
  es: {
    subject: "Tu portfolio necesita un empujón",
    title: "Te quedan 2 días de prueba",
    linkLabel: "Tu enlace",
    viewsLabel: "Vistas",
    noteZero: "Todavía nadie ha visto tu portfolio. Compártelo ahora en LinkedIn o en tu historia de Instagram — un enlace que nadie ve no convence a nadie.",
    notePositive: (n) => `${n} persona${n > 1 ? "s ya han" : " ya ha"} visto tu portfolio. Sigue compartiéndolo para llegar más lejos — cada nueva vista te acerca a una oportunidad.`,
  },
  de: {
    subject: "Dein Portfolio braucht einen Schub",
    title: "Noch 2 Tage Testphase",
    linkLabel: "Dein Link",
    viewsLabel: "Aufrufe",
    noteZero: "Noch hat niemand dein Portfolio gesehen. Teile es jetzt auf LinkedIn oder in deiner Instagram-Story — ein Link, den niemand sieht, überzeugt niemanden.",
    notePositive: (n) => `${n} Person${n > 1 ? "en haben" : " hat"} dein Portfolio bereits gesehen. Teile es weiter — jeder neue Aufruf bringt dich einer Chance näher.`,
  },
};

// Appelé depuis app/api/cron/trial-emails quand 24h-48h se sont écoulées
// depuis le début de l'essai.
export async function sendTrialReminderEmail(info: { to: string; locale: Locale; slug: string; views: number }): Promise<void> {
  const c = RELANCE_COPY[info.locale] ?? RELANCE_COPY.fr;
  const url = portfolioUrl(info.slug);
  const rows: Array<[string, string]> = [
    [c.linkLabel, `<a href="${url}" style="color:#1c1917">${esc(url)}</a>`],
    [c.viewsLabel, String(info.views)],
  ];
  const note = info.views > 0 ? c.notePositive(info.views) : c.noteZero;
  await sendEmail(info.to, c.subject, shell(c.title, rows, note));
}

// ── Dernier jour (J3) — urgence + lien direct vers le paiement ──────────────

const J3_COPY: Record<Locale, { subject: string; title: string; linkLabel: string; viewsLabel: string; note: (n: number) => string; cta: string }> = {
  fr: {
    subject: "Ton portfolio expire ce soir",
    title: "Dernier jour d'essai",
    linkLabel: "Ton lien",
    viewsLabel: "Vues",
    note: (n) => `Ton portfolio expire ce soir${n > 0 ? ` — ${n} vue${n > 1 ? "s" : ""} enregistrée${n > 1 ? "s" : ""}` : ""}. Passe à 5,99€/mois pour ne pas le perdre : ton lien, ton contenu et tes réglages restent exactement comme aujourd'hui.`,
    cta: "Continuer avec Folyo",
  },
  en: {
    subject: "Your portfolio expires tonight",
    title: "Last day of your trial",
    linkLabel: "Your link",
    viewsLabel: "Views",
    note: (n) => `Your portfolio expires tonight${n > 0 ? ` — ${n} view${n > 1 ? "s" : ""} recorded` : ""}. Switch to €5.99/month to keep it: your link, content and settings stay exactly as they are today.`,
    cta: "Continue with Folyo",
  },
  es: {
    subject: "Tu portfolio expira esta noche",
    title: "Último día de prueba",
    linkLabel: "Tu enlace",
    viewsLabel: "Vistas",
    note: (n) => `Tu portfolio expira esta noche${n > 0 ? ` — ${n} vista${n > 1 ? "s" : ""} registrada${n > 1 ? "s" : ""}` : ""}. Pasa a 5,99€/mes para no perderlo: tu enlace, contenido y ajustes se quedan exactamente como hoy.`,
    cta: "Continuar con Folyo",
  },
  de: {
    subject: "Dein Portfolio läuft heute Abend ab",
    title: "Letzter Tag der Testphase",
    linkLabel: "Dein Link",
    viewsLabel: "Aufrufe",
    note: (n) => `Dein Portfolio läuft heute Abend ab${n > 0 ? ` — ${n} Aufruf${n > 1 ? "e" : ""} erfasst` : ""}. Wechsle für 5,99€/Monat, um es zu behalten: Link, Inhalt und Einstellungen bleiben genau wie heute.`,
    cta: "Mit Folyo weitermachen",
  },
};

// Appelé depuis app/api/cron/trial-emails dans les dernières 24h de l'essai.
export async function sendTrialLastDayEmail(info: { to: string; locale: Locale; slug: string; views: number }): Promise<void> {
  const c = J3_COPY[info.locale] ?? J3_COPY.fr;
  const url = portfolioUrl(info.slug);
  const rows: Array<[string, string]> = [
    [c.linkLabel, `<a href="${url}" style="color:#1c1917">${esc(url)}</a>`],
    [c.viewsLabel, String(info.views)],
  ];
  const note = c.note(info.views) + ctaButton(checkoutUrl(), c.cta);
  await sendEmail(info.to, c.subject, shell(c.title, rows, note));
}
