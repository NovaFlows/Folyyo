"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { Locale } from "@/lib/i18n/locale";

const CONTENT: Record<Locale, { kicker: string; title: string; items: { q: string; a: string }[] }> = {
  fr: {
    kicker: "Questions fréquentes",
    title: "Tout ce qu'il faut savoir",
    items: [
      {
        q: "Est-ce vraiment gratuit ?",
        a: "Tu as un essai complet de 7 jours, sans carte bancaire — génération, édition par IA, tout est débloqué. Ensuite, l'abonnement est à 5,99€/mois ou 49,99€/an.",
      },
      {
        q: "Ai-je besoin de compétences techniques ?",
        a: "Non. Tu importes ton CV (ou tes réseaux GitHub/YouTube), l'IA génère ton portfolio en moins de 60 secondes, et tu l'ajustes ensuite en glissant les widgets ou en discutant avec l'IA.",
      },
      {
        q: "Que se passe-t-il si mon essai se termine sans que je m'abonne ?",
        a: "Ton compte et ton portfolio restent conservés — rien n'est supprimé. Le site public est simplement mis en pause jusqu'à ce que tu t'abonnes, avec la même adresse.",
      },
      {
        q: "Puis-je changer le design après la génération ?",
        a: "Oui, à tout moment — thèmes, couleurs, polices, mise en page des widgets, et tu peux même demander à l'IA de refaire le style en lui décrivant ce que tu veux.",
      },
      {
        q: "Puis-je annuler à tout moment ?",
        a: "Oui, en un clic depuis la page Abonnement — aucun engagement, aucune question posée.",
      },
    ],
  },
  en: {
    kicker: "Frequently asked questions",
    title: "Everything you need to know",
    items: [
      {
        q: "Is it really free?",
        a: "You get a full 7-day trial, no credit card needed — generation, AI editing, everything unlocked. After that, it's €5.99/month or €49.99/year.",
      },
      {
        q: "Do I need technical skills?",
        a: "No. Upload your CV (or connect GitHub/YouTube), the AI generates your portfolio in under 60 seconds, and you fine-tune it by dragging widgets or chatting with the AI.",
      },
      {
        q: "What happens if my trial ends and I don't subscribe?",
        a: "Your account and portfolio are kept — nothing is deleted. The public site is simply paused until you subscribe, on the exact same address.",
      },
      {
        q: "Can I change the design after generation?",
        a: "Yes, anytime — themes, colors, fonts, widget layout, and you can even ask the AI to restyle it by describing what you want.",
      },
      {
        q: "Can I cancel anytime?",
        a: "Yes, one click from the Billing page — no commitment, no questions asked.",
      },
    ],
  },
  es: {
    kicker: "Preguntas frecuentes",
    title: "Todo lo que necesitas saber",
    items: [
      {
        q: "¿Es realmente gratis?",
        a: "Tienes una prueba completa de 7 días, sin tarjeta de crédito — generación, edición por IA, todo desbloqueado. Después, la suscripción cuesta 5,99€/mes o 49,99€/año.",
      },
      {
        q: "¿Necesito conocimientos técnicos?",
        a: "No. Subes tu CV (o conectas GitHub/YouTube), la IA genera tu portfolio en menos de 60 segundos, y luego lo ajustas arrastrando los widgets o hablando con la IA.",
      },
      {
        q: "¿Qué pasa si mi prueba termina y no me suscribo?",
        a: "Tu cuenta y tu portfolio se conservan — nada se elimina. El sitio público simplemente se pausa hasta que te suscribas, con la misma dirección.",
      },
      {
        q: "¿Puedo cambiar el diseño después de generarlo?",
        a: "Sí, en cualquier momento — temas, colores, tipografías, disposición de los widgets, e incluso puedes pedirle a la IA que rehaga el estilo describiendo lo que quieres.",
      },
      {
        q: "¿Puedo cancelar en cualquier momento?",
        a: "Sí, con un clic desde la página de Suscripción — sin compromiso, sin preguntas.",
      },
    ],
  },
  de: {
    kicker: "Häufig gestellte Fragen",
    title: "Alles, was du wissen musst",
    items: [
      {
        q: "Ist es wirklich kostenlos?",
        a: "Du bekommst eine vollständige 7-tägige Testphase, keine Kreditkarte nötig — Generierung, KI-Bearbeitung, alles freigeschaltet. Danach kostet das Abo 5,99 €/Monat oder 49,99 €/Jahr.",
      },
      {
        q: "Brauche ich technische Kenntnisse?",
        a: "Nein. Du lädst deinen Lebenslauf hoch (oder verbindest GitHub/YouTube), die KI generiert dein Portfolio in unter 60 Sekunden, und du passt es danach per Drag & Drop oder im Chat mit der KI an.",
      },
      {
        q: "Was passiert, wenn meine Testphase endet und ich kein Abo abschließe?",
        a: "Dein Konto und dein Portfolio bleiben erhalten — nichts wird gelöscht. Die öffentliche Seite wird einfach pausiert, bis du abonnierst, unter derselben Adresse.",
      },
      {
        q: "Kann ich das Design nach der Generierung ändern?",
        a: "Ja, jederzeit — Designs, Farben, Schriftarten, Widget-Layout, und du kannst die KI sogar bitten, den Stil neu zu gestalten, indem du beschreibst, was du willst.",
      },
      {
        q: "Kann ich jederzeit kündigen?",
        a: "Ja, mit einem Klick auf der Abo-Seite — keine Verpflichtung, keine Rückfragen.",
      },
    ],
  },
};

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: "1px solid rgba(0,0,0,0.08)" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 py-5 text-left"
      >
        <span className="text-base font-medium" style={{ color: "#1c1917" }}>{q}</span>
        <ChevronDown
          size={18}
          strokeWidth={1.75}
          style={{ color: "#a09a94", flexShrink: 0, transition: "transform 0.2s", transform: open ? "rotate(180deg)" : "none" }}
        />
      </button>
      <div style={{ display: "grid", gridTemplateRows: open ? "1fr" : "0fr", transition: "grid-template-rows 0.25s ease" }}>
        <div style={{ overflow: "hidden" }}>
          <p className="pb-5 text-sm leading-relaxed" style={{ color: "#78716c", maxWidth: 640 }}>{a}</p>
        </div>
      </div>
    </div>
  );
}

export default function FAQ({ locale }: { locale: Locale }) {
  const c = CONTENT[locale];
  return (
    <section id="faq" className="ld-reveal px-6 py-24" style={{ background: "#f0ece6" }}>
      <div className="mx-auto max-w-3xl">
        <div className="mb-12 text-center">
          <p className="text-sm tracking-widest uppercase mb-4" style={{ color: "#c9a96e" }}>{c.kicker}</p>
          <h2 className="text-4xl" style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 500, color: "#1c1917" }}>
            {c.title}
          </h2>
        </div>
        <div>
          {c.items.map((item) => (
            <FAQItem key={item.q} q={item.q} a={item.a} />
          ))}
        </div>
      </div>
    </section>
  );
}
