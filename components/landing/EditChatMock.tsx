"use client";

import { useEffect, useState } from "react";

// Mock animé du chat d'édition — démontre la fonctionnalité (édition en
// langage naturel) au lieu de juste la décrire : la commande s'écrit lettre
// par lettre, puis la réponse apparaît, en boucle sur les 4 exemples déjà
// listés dans la colonne de gauche de la section. aria-hidden : purement
// décoratif, le vrai contenu textuel de la section suffit sans JS.
const EXCHANGES = [
  { cmd: "Change la couleur principale en terracotta", reply: "Couleur mise à jour · Site republié" },
  { cmd: "Ajoute une section témoignages", reply: "Section ajoutée · Site republié" },
  { cmd: "Mets ma photo en fond du hero", reply: "Photo de fond mise à jour · Site republié" },
  { cmd: "Réécris mon intro, je veux quelque chose de plus percutant", reply: "Intro réécrite · Site republié" },
];

type Phase = "typing" | "thinking" | "success";

const TYPE_MS_PER_CHAR = 28;
const THINK_MS = 700;
const SUCCESS_HOLD_MS = 2400;

export default function EditChatMock() {
  const [cmdIndex, setCmdIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("typing");
  const [typedLen, setTypedLen] = useState(0);
  const [reduced, setReduced] = useState(false);

  const exchange = EXCHANGES[cmdIndex];

  useEffect(() => {
    const rm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setReduced(rm);
    if (rm) setPhase("success"); // état final statique, pas de cycle
  }, []);

  // Machine à états : typing (lettre par lettre) → thinking (pause) → success (tenu) → commande suivante
  useEffect(() => {
    if (reduced) return;
    if (phase !== "typing") return;
    if (typedLen >= exchange.cmd.length) {
      const t = setTimeout(() => setPhase("thinking"), 400);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setTypedLen((n) => n + 1), TYPE_MS_PER_CHAR);
    return () => clearTimeout(t);
  }, [phase, typedLen, exchange, reduced]);

  useEffect(() => {
    if (reduced || phase !== "thinking") return;
    const t = setTimeout(() => setPhase("success"), THINK_MS);
    return () => clearTimeout(t);
  }, [phase, reduced]);

  useEffect(() => {
    if (reduced || phase !== "success") return;
    const t = setTimeout(() => {
      setCmdIndex((i) => (i + 1) % EXCHANGES.length);
      setTypedLen(0);
      setPhase("typing");
    }, SUCCESS_HOLD_MS);
    return () => clearTimeout(t);
  }, [phase, reduced]);

  const userText = reduced ? exchange.cmd : exchange.cmd.slice(0, typedLen);
  const showCursor = !reduced && phase === "typing";

  return (
    <div aria-hidden="true" className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(0,0,0,0.08)", background: "#f0ece6" }}>
      <div className="px-5 py-4" style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
        <p className="text-xs font-medium" style={{ color: "#a09a94" }}>Éditeur Folyyo</p>
      </div>

      <div className="p-5 flex flex-col justify-center gap-3" style={{ minHeight: 230 }}>
        <div className="flex justify-end gap-2 text-sm">
          <div className="rounded-2xl px-4 py-2.5 max-w-[80%] text-sm" style={{ background: "#1c1917", color: "#fff" }}>
            {userText}
            {showCursor && <span className="cursor-blink">▍</span>}
          </div>
        </div>

        {phase === "thinking" && (
          <div className="ld-chat-in flex justify-start gap-2 text-sm">
            <div className="h-6 w-6 shrink-0 rounded-full flex items-center justify-center text-xs" style={{ background: "rgba(0,0,0,0.06)", color: "#a09a94" }}>·</div>
            <div className="rounded-2xl px-4 py-2.5 max-w-[80%] text-sm" style={{ background: "rgba(0,0,0,0.05)", color: "#a09a94" }}>
              Analyse en cours…
            </div>
          </div>
        )}

        {phase === "success" && (
          <div className="ld-chat-in flex justify-start gap-2 text-sm">
            <div className="h-6 w-6 shrink-0 rounded-full flex items-center justify-center text-xs" style={{ background: "rgba(201,169,110,0.15)", color: "#c9a96e" }}>✓</div>
            <div className="rounded-2xl px-4 py-2.5 max-w-[80%] text-sm" style={{ background: "rgba(201,169,110,0.1)", color: "#b8935a", border: "1px solid rgba(201,169,110,0.2)" }}>
              ✓ {exchange.reply}
            </div>
          </div>
        )}
      </div>

      <div className="px-4 py-3" style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}>
        <div className="flex gap-2">
          <div className="flex-1 rounded-xl px-4 py-3 text-sm" style={{ background: "rgba(255,255,255,0.7)", color: "#c4bdb5" }}>
            Décris une modification…
          </div>
          <button className="rounded-xl px-5 py-3 text-sm font-medium text-white" style={{ background: "#1c1917" }}>→</button>
        </div>
      </div>
    </div>
  );
}
