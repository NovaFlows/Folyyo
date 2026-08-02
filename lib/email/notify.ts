// Notifications e-mail internes (destinées à l'exploitant, pas aux clients) :
// nouvel abonné, nouveau message de support en attente dans l'admin.
//
// Envoi via l'API HTTP de Resend (aucune dépendance ajoutée — simple fetch).
// Conçu pour ne JAMAIS interrompre le flux appelant : si RESEND_API_KEY est
// absente, ou si l'appel échoue, on journalise et on retourne sans lever
// d'exception (un webhook Stripe doit répondre 200 même si l'e-mail échoue).

const RESEND_ENDPOINT = "https://api.resend.com/emails";

// Adresse qui reçoit les notifications (par défaut l'e-mail de l'exploitant).
function adminEmail(): string {
  return process.env.ADMIN_NOTIFY_EMAIL || "novaflows.pro@gmail.com";
}

// Expéditeur. Par défaut le domaine de test Resend (n'autorise l'envoi que vers
// l'e-mail du compte Resend). Une fois folyo.page vérifié dans Resend, passer
// EMAIL_FROM à "Folyo <notifications@folyo.page>".
function fromAddress(): string {
  return process.env.EMAIL_FROM || "Folyo <onboarding@resend.dev>";
}

async function sendAdminEmail(subject: string, html: string): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn("[email] RESEND_API_KEY absente — notification ignorée:", subject);
    return;
  }
  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: fromAddress(), to: [adminEmail()], subject, html }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error("[email] échec d'envoi:", res.status, body.slice(0, 300));
    }
  } catch (err) {
    console.error("[email] erreur réseau:", (err as Error).message);
  }
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
