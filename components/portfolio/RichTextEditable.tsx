"use client";

import { useEffect, useRef, useState } from "react";
import { Eraser, Bold, Italic, Underline, Baseline, Highlighter, Link2 } from "lucide-react";
import { sanitizeRichText, richTextLength, isSafeRichTextUrl } from "@/lib/portfolio/rich-text";

// Champs texte "riches" (gras/italique/souligné/surligné/couleur/lien) pour
// l'éditeur — remplacent les <input>/<textarea> classiques partout où le
// contenu est de la prose affichée sur le portfolio (pas les URLs/emails/
// couleurs de thème, qui restent en champ simple). S'appuient sur le
// contentEditable + document.execCommand natif du navigateur : sélection →
// applique sur la sélection ; pas de sélection → les prochains caractères
// tapés héritent du format jusqu'à nouveau clic sur le bouton — comportement
// natif, pas réimplémenté à la main. Le lien et la couleur ont besoin d'une
// sélection non vide (on ne "sticky" pas une URL ou une couleur sur la frappe
// future, contrairement au gras/italique/souligné).
//
// Le contenu est stocké tel quel dans les champs `string` existants (pas de
// changement de schéma), limité à <b>/<i>/<u>/<a href>/<span style="color…">
// (voir lib/portfolio/rich-text.ts).
//
// Piège classique contentEditable+React : si on repose `innerHTML` à CHAQUE
// frappe (via un rendu contrôlé par `value`), le curseur saute au début. On
// ne resynchronise donc le DOM que si `value` a changé depuis une source
// EXTERNE (undo, changement de section, ou premier montage) — pas depuis
// notre propre onChange (repéré via `lastEmitted`). `lastEmitted` démarre à
// `null` (jamais égal à un `value` de type string, même vide) pour forcer
// cette synchronisation initiale : sans ça, un remount (ex. quitter puis
// rouvrir le panneau d'édition du widget) affichait un champ vide alors que
// `value` contenait déjà du texte sauvegardé.
function useEditableSync(ref: React.RefObject<HTMLDivElement>, value: string, lastEmitted: React.MutableRefObject<string | null>) {
  useEffect(() => {
    if (!ref.current) return;
    if (value === lastEmitted.current) return;
    ref.current.innerHTML = sanitizeRichText(value);
    lastEmitted.current = value;
  }, [ref, value, lastEmitted]);
}

function ToolbarButton({ children, onClick, title, style }: { children: React.ReactNode; onClick: () => void; title?: string; style?: React.CSSProperties }) {
  return (
    <button type="button" title={title}
      // onMouseDown + preventDefault : empêche le bouton de voler le focus/la
      // sélection du champ contentEditable avant que execCommand (ou la
      // lecture de la sélection pour le lien/la couleur) ne s'applique.
      onMouseDown={e => e.preventDefault()}
      onClick={onClick}
      style={{ width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(0,0,0,0.12)", borderRadius: 4, background: "white", cursor: "pointer", fontSize: "0.6875rem", color: "#57534e", padding: 0, fontWeight: 800, lineHeight: 1, ...style }}>
      {children}
    </button>
  );
}

// Petite fenêtre flottante (pas window.prompt) qui demande l'URL une fois du
// texte sélectionné et 🔗 cliqué — positionnée sous la sélection via
// range.getBoundingClientRect() (coordonnées viewport, donc position:"fixed").
function LinkPopover({ rect, onConfirm, onCancel }: { rect: DOMRect; onConfirm: (url: string) => void; onCancel: () => void }) {
  const [value, setValue] = useState("");
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDocMouseDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) onCancel();
    };
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={boxRef}
      style={{ position: "fixed", top: rect.bottom + 6, left: Math.max(6, rect.left), zIndex: 1000, background: "white", border: "1px solid rgba(0,0,0,0.15)", borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.18)", padding: 6, display: "flex", gap: 4 }}>
      <input autoFocus type="text" value={value} onChange={e => setValue(e.target.value)}
        onKeyDown={e => {
          if (e.key === "Enter") { e.preventDefault(); if (value.trim()) onConfirm(value.trim()); else onCancel(); }
          if (e.key === "Escape") { e.preventDefault(); onCancel(); }
        }}
        placeholder="https://…"
        style={{ fontSize: "0.75rem", padding: "0.3rem 0.5rem", border: "1px solid rgba(0,0,0,0.15)", borderRadius: 6, outline: "none", width: 180 }} />
      <button type="button" onClick={() => { if (value.trim()) onConfirm(value.trim()); else onCancel(); }}
        style={{ fontSize: "0.7rem", padding: "0.3rem 0.6rem", borderRadius: 6, border: "none", background: "#1c1917", color: "white", cursor: "pointer", fontWeight: 600 }}>
        OK
      </button>
    </div>
  );
}

// Complète une URL sans schéma ("exemple.com") en https:// — plus tolérant
// qu'exiger que la personne tape le schéma elle-même. Rejette silencieusement
// (abandon du lien) si, même complétée, l'URL reste d'un type non sûr.
function normalizeLinkUrl(url: string): string | null {
  if (isSafeRichTextUrl(url)) return url;
  const withScheme = `https://${url}`;
  return isSafeRichTextUrl(withScheme) ? withScheme : null;
}

// Couleur du texte / surlignage : s'appuie sur le sélecteur natif du système
// (<input type="color">, même composant que ColorRow pour le thème) plutôt
// que de reconstruire une palette — la sélection est capturée AVANT
// d'ouvrir le picker (qui vole le focus) puis restaurée à la fermeture.
// styleWithCSS est activé juste le temps de la commande de couleur puis
// redésactivé : laissé actif, il ferait aussi sortir gras/italique/souligné
// en <span style="..."> au lieu de <b>/<i>/<u>, que le sanitizer ne
// reconnaît pas.
function useColorPicker(ref: React.RefObject<HTMLDivElement>, commit: () => void) {
  const inputRef = useRef<HTMLInputElement>(null);
  const savedRange = useRef<Range | null>(null);
  const pendingCmd = useRef<"foreColor" | "hiliteColor">("foreColor");

  const open = (cmd: "foreColor" | "hiliteColor") => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return; // rien sélectionné : pas de couleur possible
    savedRange.current = sel.getRangeAt(0).cloneRange();
    pendingCmd.current = cmd;
    inputRef.current?.click();
  };
  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!savedRange.current || !ref.current) return;
    ref.current.focus();
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(savedRange.current);
    document.execCommand("styleWithCSS", false, "true");
    document.execCommand(pendingCmd.current, false, e.target.value);
    document.execCommand("styleWithCSS", false, "false");
    commit();
  };
  const colorInputNode = (
    <input ref={inputRef} type="color" defaultValue="#c9a96e" onChange={onPick}
      style={{ position: "fixed", width: 0, height: 0, opacity: 0, pointerEvents: "none" }} />
  );
  return { open, colorInputNode };
}

function useRichEditable({ value, onChange, maxLength }: { value: string; onChange: (v: string) => void; maxLength?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const lastEmitted = useRef<string | null>(null);
  useEditableSync(ref, value, lastEmitted);
  const [linkPopover, setLinkPopover] = useState<{ range: Range; rect: DOMRect } | null>(null);

  const commit = () => {
    if (!ref.current) return;
    let html = sanitizeRichText(ref.current.innerHTML);
    if (maxLength && richTextLength(html) > maxLength) {
      // Cas limite : dépassement pendant la frappe (formatage en cours) —
      // on tronque en texte brut plutôt que de bloquer la saisie en silence.
      ref.current.textContent = ref.current.innerText.slice(0, maxLength);
      html = ref.current.innerHTML;
    }
    lastEmitted.current = html;
    onChange(html);
  };
  const exec = (cmd: string) => { ref.current?.focus(); document.execCommand(cmd); commit(); };
  const onPaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    document.execCommand("insertText", false, e.clipboardData.getData("text/plain"));
  };

  const openLinkPopover = () => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return; // rien sélectionné : pas de lien possible
    const range = sel.getRangeAt(0).cloneRange();
    setLinkPopover({ range, rect: range.getBoundingClientRect() });
  };
  const confirmLink = (typedUrl: string) => {
    if (!linkPopover || !ref.current) { setLinkPopover(null); return; }
    const url = normalizeLinkUrl(typedUrl);
    setLinkPopover(null);
    if (!url) return;
    ref.current.focus();
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(linkPopover.range);
    document.execCommand("createLink", false, url);
    commit();
  };

  const linkPopoverNode = linkPopover
    ? <LinkPopover rect={linkPopover.rect} onConfirm={confirmLink} onCancel={() => setLinkPopover(null)} />
    : null;

  const { open: openColorPicker, colorInputNode } = useColorPicker(ref, commit);

  return { ref, commit, exec, onPaste, openLinkPopover, linkPopoverNode, openColorPicker, colorInputNode };
}

function Toolbar({ onBold, onItalic, onUnderline, onLink, onTextColor, onHighlight, onClearFormat }: {
  onBold: () => void; onItalic: () => void; onUnderline: () => void; onLink: () => void; onTextColor: () => void; onHighlight: () => void; onClearFormat: () => void;
}) {
  return (
    <div style={{ display: "flex", gap: 3 }}>
      <ToolbarButton onClick={onBold} title="Gras"><Bold size={11} strokeWidth={2.5} /></ToolbarButton>
      <ToolbarButton onClick={onItalic} title="Italique"><Italic size={11} strokeWidth={2.5} /></ToolbarButton>
      <ToolbarButton onClick={onUnderline} title="Souligné"><Underline size={11} strokeWidth={2.5} /></ToolbarButton>
      <ToolbarButton onClick={onTextColor} title="Couleur du texte" style={{ borderBottom: "2px solid #c9a96e" }}><Baseline size={11} strokeWidth={2} /></ToolbarButton>
      <ToolbarButton onClick={onHighlight} title="Surligner"><Highlighter size={11} strokeWidth={2} /></ToolbarButton>
      <ToolbarButton onClick={onLink} title="Transformer la sélection en lien"><Link2 size={11} strokeWidth={2} /></ToolbarButton>
      <ToolbarButton onClick={onClearFormat} title="Effacer la mise en forme (gras, couleur, surlignage…)">
        <Eraser size={11} strokeWidth={2} />
      </ToolbarButton>
    </div>
  );
}

export function RichTextField({ label, value, onChange, placeholder, maxLength }: {
  label?: string; value: string; onChange: (v: string) => void; placeholder?: string; maxLength?: number;
}) {
  const { ref, commit, exec, onPaste, openLinkPopover, linkPopoverNode, openColorPicker, colorInputNode } = useRichEditable({ value, onChange, maxLength });
  return (
    <div style={{ marginBottom: "0.625rem" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.2rem", minHeight: label ? undefined : 20 }}>
        {label ? <label style={{ fontSize: "0.7rem", color: "#78716c" }}>{label}</label> : <span />}
        <Toolbar onBold={() => exec("bold")} onItalic={() => exec("italic")} onUnderline={() => exec("underline")}
          onLink={openLinkPopover} onTextColor={() => openColorPicker("foreColor")} onHighlight={() => openColorPicker("hiliteColor")}
          onClearFormat={() => exec("removeFormat")} />
      </div>
      <div ref={ref} contentEditable suppressContentEditableWarning
        onInput={commit} onPaste={onPaste}
        onKeyDown={e => { if (e.key === "Enter") e.preventDefault(); }}
        data-placeholder={placeholder}
        className="rich-text-editable"
        style={{ width: "100%", padding: "0.4rem 0.625rem", fontSize: "0.7875rem", color: "#1c1917", background: "white", border: "1px solid rgba(0,0,0,0.1)", borderRadius: "0.4rem", outline: "none", boxSizing: "border-box", minHeight: "1.4em" }} />
      {linkPopoverNode}
      {colorInputNode}
    </div>
  );
}

export function RichTextArea({ label, value, onChange, placeholder, maxLength, rows = 3 }: {
  label?: string; value: string; onChange: (v: string) => void; placeholder?: string; maxLength?: number; rows?: number;
}) {
  const { ref, commit, exec, onPaste, openLinkPopover, linkPopoverNode, openColorPicker, colorInputNode } = useRichEditable({ value, onChange, maxLength });
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      document.execCommand("insertLineBreak");
      commit();
    }
  };
  return (
    <div style={{ marginBottom: "0.625rem" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.2rem", minHeight: label ? undefined : 20 }}>
        {label ? <label style={{ fontSize: "0.7rem", color: "#78716c" }}>{label}</label> : <span />}
        <Toolbar onBold={() => exec("bold")} onItalic={() => exec("italic")} onUnderline={() => exec("underline")}
          onLink={openLinkPopover} onTextColor={() => openColorPicker("foreColor")} onHighlight={() => openColorPicker("hiliteColor")}
          onClearFormat={() => exec("removeFormat")} />
      </div>
      <div ref={ref} contentEditable suppressContentEditableWarning
        onInput={commit} onPaste={onPaste} onKeyDown={onKeyDown}
        data-placeholder={placeholder}
        className="rich-text-editable"
        style={{ width: "100%", padding: "0.4rem 0.625rem", fontSize: "0.7875rem", color: "#1c1917", background: "white", border: "1px solid rgba(0,0,0,0.1)", borderRadius: "0.4rem", outline: "none", boxSizing: "border-box", minHeight: `${rows * 1.5}em`, lineHeight: 1.5, overflowY: "auto" }} />
      {maxLength && <p style={{ fontSize: "0.625rem", color: "#c8c4bf", textAlign: "right", margin: "0.2rem 0 0" }}>{richTextLength(value)}/{maxLength}</p>}
      {linkPopoverNode}
      {colorInputNode}
    </div>
  );
}
