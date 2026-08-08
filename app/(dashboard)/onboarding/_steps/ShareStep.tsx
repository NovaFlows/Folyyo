"use client";

import { useState } from "react";
import { Check, Copy, Link2 } from "lucide-react";
import type { Dictionary } from "@/lib/i18n/dictionaries/fr";

const SITE_URL = "https://folyo.page";

interface Props {
  slug: string;
  t: Dictionary["onboarding"];
  onContinue: () => void;
}

// Dernier écran de l'onboarding — juste après une génération réussie, avant
// de rejoindre le dashboard/éditeur. Objectif conversion : un essai ne doit
// jamais se terminer sans qu'au moins un partage ait eu lieu, sinon les
// e-mails de relance (lib/email/notify.ts) et le bandeau du dashboard n'ont
// rien à montrer — 0 vue = aucun sentiment de perte à l'expiration.
export default function ShareStep({ slug, t, onContinue }: Props) {
  const url = `${SITE_URL}/${slug}`;
  const caption = t.share.captionText(url);

  return (
    <div className="text-center">
      <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-full"
        style={{ background: "rgba(201,169,110,0.1)", border: "1px solid rgba(201,169,110,0.2)" }}>
        <Link2 size={18} strokeWidth={1.75} style={{ color: "#c9a96e" }} />
      </div>
      <h2 className="mb-2 text-2xl serif" style={{ fontWeight: 500, color: "#1c1917" }}>{t.share.title}</h2>
      <p className="mb-8 text-sm" style={{ color: "#78716c" }}>{t.share.subtitle}</p>

      <CopyField label={t.share.linkLabel} value={url} copyLabel={t.share.copy} copiedLabel={t.share.copied} emphasize />
      <div className="mt-4">
        <CopyField label={t.share.captionLabel} value={caption} copyLabel={t.share.copy} copiedLabel={t.share.copied} />
      </div>

      <button onClick={onContinue}
        className="mt-8 w-full rounded-xl py-3.5 text-sm font-semibold text-white transition hover:opacity-80"
        style={{ background: "#1c1917" }}>
        {t.share.continueBtn}
      </button>
    </div>
  );
}

// Champ texte en lecture seule + bouton copier — utilisé pour le lien du
// portfolio et pour la légende suggérée (LinkedIn / bio Instagram).
function CopyField({ label, value, copyLabel, copiedLabel, emphasize = false }: {
  label: string; value: string; copyLabel: string; copiedLabel: string; emphasize?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* presse-papier indisponible (permissions navigateur) — pas bloquant */ }
  }

  return (
    <div className="text-left">
      <p className="mb-1.5 text-xs" style={{ color: "#a09a94" }}>{label}</p>
      <div className="flex items-center gap-2 rounded-xl p-1.5 pl-4"
        style={{ background: "#f0ece6", border: "1px solid rgba(0,0,0,0.06)" }}>
        <p className="flex-1 truncate text-left" style={{
          color: emphasize ? "#1c1917" : "#57534e",
          fontWeight: emphasize ? 600 : 400,
          fontSize: emphasize ? "0.875rem" : "0.8125rem",
        }}>
          {value}
        </p>
        <button onClick={handleCopy}
          className="flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition hover:opacity-80"
          style={{ background: copied ? "#22a06b" : "#1c1917", color: "white" }}>
          {copied ? <Check size={13} strokeWidth={2} /> : <Copy size={13} strokeWidth={2} />}
          {copied ? copiedLabel : copyLabel}
        </button>
      </div>
    </div>
  );
}
