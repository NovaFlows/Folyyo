"use client";

import { useState } from "react";
import RichText from "./RichText";
import { stripRichTags, isSafeRichTextUrl } from "@/lib/portfolio/rich-text";

export default function Carousel({ images, pri, txt, fill = false, fontFamily, fontSize, descriptionWidth }: {
  images: { url: string; caption?: string; description?: string; linkUrl?: string }[];
  pri: string; txt: string; fill?: boolean;
  fontFamily?: string; fontSize?: number; descriptionWidth?: number;
}) {
  const [index, setIndex] = useState(0);
  if (images.length === 0) return null;

  const go = (i: number) => setIndex((i + images.length) % images.length);
  const current = images[index];
  // isSafeRichTextUrl rejette les schémas exécutables ("javascript:", etc.) —
  // sans ce garde-fou, un linkUrl malveillant posé sur SON PROPRE portfolio
  // (via l'éditeur ou un appel direct à l'API) s'exécutait dans le navigateur
  // de n'importe quel visiteur au clic (XSS stocké, même origine folyo.page).
  const hasLink = Boolean(current.linkUrl) && isSafeRichTextUrl(current.linkUrl!);
  // Basé sur TOUT le carrousel (pas seulement la photo affichée) : si une
  // seule photo a une description, la mise en page 2 colonnes s'applique à
  // toutes les photos — sinon la taille de l'image sauterait en naviguant
  // entre une photo "avec" (colonne réduite) et une photo "sans" (pleine
  // largeur). Les photos sans description montrent juste un cadre vide.
  const carouselHasDescription = images.some(img => img.description);
  // fontSize régit la description ; la légende/titre s'aligne dessus en
  // proportionnel (comme author vs text sur le widget "quote") — les deux
  // gardent leur apparence d'origine tant que fontFamily/fontSize ne sont
  // pas définis (réglages optionnels, rétrocompatibles avec les carrousels
  // existants qui n'ont jamais eu ces champs).
  const descFs = fontSize ? `${fontSize}px` : "0.85rem";
  const captionFsRow = fontSize ? `${Math.round(fontSize * 1.15)}px` : "1rem"; // titre, mode 2 colonnes
  const captionFsStack = fontSize ? `${fontSize}px` : "0.8rem"; // légende, mode empilé

  // Toujours en hauteur pleine (peu importe `fill`, qui ne change plus que le
  // radius/la position des points) : avec un maxHeight fixe, une case de
  // grille redimensionnée plus petite que ce plafond rognait le bas de l'image
  // — et la légende en overlay avec, la rendant invisible.
  const imgEl = (
    <img src={current.url} alt={current.caption ? stripRichTags(current.caption) : ""}
      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
  );

  // Zone image + flèches + points — flex:1 (jamais réduite en %) : quand une
  // description est ajoutée, c'est le WIDGET tout entier qui s'élargit
  // (VisualEditor.tsx/updateBlock) pour caser le cadre texte à côté, pas
  // l'image qui rétrécit — elle garde donc exactement le même cadrage. Coins
  // droits carrés en mode description (le cadre texte vient s'y coller sans
  // espace, façon carte unique coupée en deux) — seulement quand CETTE photo
  // a vraiment une description ; sinon l'image reste normalement arrondie et
  // la légende reprend sa place classique en dessous.
  const imageBox = (
    <div style={{ position: "relative", borderRadius: fill ? 0 : current.description ? "0.625rem 0 0 0.625rem" : "0.625rem", overflow: "hidden", cursor: hasLink ? "pointer" : undefined, flex: 1, minHeight: 0 }}>
      {hasLink
        ? <a href={current.linkUrl} target="_blank" rel="noopener noreferrer" style={{ display: "block", height: "100%" }}>{imgEl}</a>
        : imgEl}
      {images.length > 1 && (
        <>
          <button onClick={() => go(index - 1)} aria-label="Précédent"
            style={{ position: "absolute", top: "50%", left: 10, transform: "translateY(-50%)", width: 34, height: 34, borderRadius: "50%", background: "rgba(0,0,0,0.45)", color: "#fff", border: "none", cursor: "pointer", fontSize: "1rem", display: "flex", alignItems: "center", justifyContent: "center" }}>
            ‹
          </button>
          <button onClick={() => go(index + 1)} aria-label="Suivant"
            style={{ position: "absolute", top: "50%", right: 10, transform: "translateY(-50%)", width: 34, height: 34, borderRadius: "50%", background: "rgba(0,0,0,0.45)", color: "#fff", border: "none", cursor: "pointer", fontSize: "1rem", display: "flex", alignItems: "center", justifyContent: "center" }}>
            ›
          </button>
        </>
      )}
      {/* Points de navigation en overlay — mode fill uniquement (économise la hauteur) */}
      {fill && images.length > 1 && (
        <div style={{ position: "absolute", bottom: 8, left: 0, right: 0, display: "flex", justifyContent: "center", gap: "0.375rem" }}>
          {images.map((_, i) => (
            <button key={i} onClick={() => go(i)} aria-label={`Aller à l'image ${i + 1}`}
              style={{ width: i === index ? 18 : 7, height: 7, borderRadius: 4, background: i === index ? "#fff" : "rgba(255,255,255,0.45)", border: "none", cursor: "pointer", transition: "all 0.2s" }} />
          ))}
        </div>
      )}
    </div>
  );

  // Colonne image : la photo, + sa légende juste en dessous (comme avant)
  // UNIQUEMENT quand cette photo n'a pas sa propre description — si elle en a
  // une, la légende sert de titre dans le cadre texte à droite à la place
  // (voir plus bas).
  const imageColumn = (
    <div style={{ flex: 1, minHeight: 0, minWidth: 0, display: "flex", flexDirection: "column" }}>
      {imageBox}
      {!current.description && current.caption && (
        <p style={{ flexShrink: 0, fontSize: captionFsStack, fontFamily: fontFamily || undefined, color: `${txt}80`, textAlign: "center", margin: "0.5rem 0 0", lineHeight: 1.4, fontStyle: "italic" }}>
          <RichText html={current.caption}/>
          {hasLink && <a href={current.linkUrl} target="_blank" rel="noopener noreferrer" style={{ color: pri, marginLeft: "0.25rem", fontStyle: "normal" }}>↗</a>}
        </p>
      )}
    </div>
  );

  // Description longue (sur au moins une photo du carrousel) : bascule en 2
  // colonnes (photo à gauche, texte à droite) pour TOUTES les photos, y
  // compris celles sans leur propre description — sinon la taille de l'image
  // changerait en navigant d'une photo à l'autre. Pour une photo sans
  // description, le cadre texte reste vide (transparent, pas de carte visible)
  // et sa légende repasse sous l'image, comme en mise en page classique.
  // Sans description nulle part sur le carrousel, mise en page verticale
  // d'origine (légende italique centrée sous la photo).
  if (carouselHasDescription) {
    return (
      <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
        <div style={{ flex: 1, minHeight: 0, display: "flex" }}>
          {imageColumn}
          {/* Cadre blanc collé à l'image (pas de gap) — largeur fixe, pas
              proportionnelle, pour ne pas dépendre de la taille de l'image :
              c'est le widget entier qui s'est élargi pour lui faire de la
              place (voir VisualEditor.tsx/updateBlock). Transparent (pas de
              carte visible) si cette photo n'a pas de description. */}
          <div style={{ width: descriptionWidth ?? 240, flexShrink: 0, minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "center", overflowY: "auto", background: current.description ? "#fff" : "transparent", borderLeft: current.description ? "1px solid rgba(0,0,0,0.08)" : "none", borderRadius: fill || !current.description ? 0 : "0 0.625rem 0.625rem 0", padding: current.description ? "1rem" : 0, fontFamily: fontFamily || undefined }}>
            {current.description && current.caption && (
              <p style={{ fontSize: captionFsRow, fontWeight: 700, color: "#1c1917", margin: "0 0 0.5rem", lineHeight: 1.3 }}>
                <RichText html={current.caption}/>
                {hasLink && <a href={current.linkUrl} target="_blank" rel="noopener noreferrer" style={{ color: pri, marginLeft: "0.375rem", fontWeight: 400 }}>↗</a>}
              </p>
            )}
            {current.description && <p style={{ fontSize: descFs, color: "#78716c", lineHeight: 1.65, margin: 0, whiteSpace: "pre-wrap" }}><RichText html={current.description}/></p>}
          </div>
        </div>
        {!fill && images.length > 1 && (
          <div style={{ flexShrink: 0, display: "flex", justifyContent: "center", gap: "0.375rem", marginTop: "0.625rem" }}>
            {images.map((_, i) => (
              <button key={i} onClick={() => go(i)} aria-label={`Aller à l'image ${i + 1}`}
                style={{ width: i === index ? 18 : 7, height: 7, borderRadius: 4, background: i === index ? pri : `${pri}35`, border: "none", cursor: "pointer", transition: "all 0.2s" }} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {imageColumn}
      {!fill && images.length > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: "0.375rem", marginTop: "0.625rem" }}>
          {images.map((_, i) => (
            <button key={i} onClick={() => go(i)} aria-label={`Aller à l'image ${i + 1}`}
              style={{ width: i === index ? 18 : 7, height: 7, borderRadius: 4, background: i === index ? pri : `${pri}35`, border: "none", cursor: "pointer", transition: "all 0.2s" }} />
          ))}
        </div>
      )}
    </div>
  );
}
