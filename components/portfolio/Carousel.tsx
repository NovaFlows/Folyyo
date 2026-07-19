"use client";

import { useState } from "react";

export default function Carousel({ images, pri, txt, fill = false }: {
  images: { url: string; caption?: string; linkUrl?: string }[];
  pri: string; txt: string; fill?: boolean;
}) {
  const [index, setIndex] = useState(0);
  if (images.length === 0) return null;

  const go = (i: number) => setIndex((i + images.length) % images.length);
  const current = images[index];
  const hasLink = Boolean(current.linkUrl);

  // Toujours en hauteur pleine (peu importe `fill`, qui ne change plus que le
  // radius/la position des points) : avec un maxHeight fixe, une case de
  // grille redimensionnée plus petite que ce plafond rognait le bas de l'image
  // — et la légende en overlay avec, la rendant invisible.
  const imgEl = (
    <img src={current.url} alt={current.caption ?? ""}
      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
  );

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ position: "relative", borderRadius: fill ? 0 : "0.625rem", overflow: "hidden", cursor: hasLink ? "pointer" : undefined, flex: 1, minHeight: 0 }}>
        {hasLink
          ? <a href={current.linkUrl} target="_blank" rel="noopener noreferrer" style={{ display: "block" }}>{imgEl}</a>
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
      {/* Légende sous l'image — pas en superposition, pour rester lisible quelle
          que soit la photo */}
      {current.caption && (
        <p style={{ flexShrink: 0, fontSize: "0.8rem", color: `${txt}80`, textAlign: "center", margin: "0.5rem 0 0", lineHeight: 1.4, fontStyle: "italic" }}>
          {current.caption}
          {hasLink && <a href={current.linkUrl} target="_blank" rel="noopener noreferrer" style={{ color: pri, marginLeft: "0.25rem", fontStyle: "normal" }}>↗</a>}
        </p>
      )}
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
