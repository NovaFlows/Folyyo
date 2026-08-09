"use client";

import { useState, useRef } from "react";
import { Play } from "lucide-react";
import { getDictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/types";

// Film de présentation sur la landing.
//
// Trois partis pris, tous dictés par la performance et par la façon dont on
// regarde une vidéo sur une page web :
//
//  1. `preload="none"` + affiche : tant que le visiteur ne clique pas, RIEN
//     n'est téléchargé. Un chargement automatique de 4 Mo pénaliserait le
//     temps d'affichage de la page — donc le référencement — pour une vidéo
//     que la majorité des visiteurs ne regardera pas.
//  2. Lecture déclenchée par un clic, donc AVEC le son. Un démarrage
//     automatique serait forcément muet (les navigateurs l'imposent), et ce
//     film porte l'essentiel de son propos par la voix off.
//  3. Le film reste sous-titré malgré tout : certains couperont le son.
export default function FilmSection({ locale }: { locale: Locale }) {
  const t = getDictionary(locale).film;
  const [playing, setPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const start = () => {
    setPlaying(true);
    // Le <video> n'est monté qu'après ce changement d'état : on attend la
    // frame suivante pour que la ref existe avant d'appeler play().
    requestAnimationFrame(() => videoRef.current?.play());
  };

  return (
    <div className="mx-auto max-w-4xl">
      <div
        className="relative overflow-hidden rounded-2xl"
        style={{ background: "#000", border: "1px solid rgba(0,0,0,0.08)", boxShadow: "0 24px 60px -24px rgba(28,25,23,0.35)" }}
      >
        {/* Ratio 16:9 réservé dès le premier rendu : sans ça, l'apparition de
            la vidéo décalerait le contenu sous elle (mauvais CLS). */}
        <div style={{ aspectRatio: "16 / 9", width: "100%" }}>
          {playing ? (
            <video
              ref={videoRef}
              src="/video/folyo-film.mp4"
              poster="/video/folyo-poster.jpg"
              controls
              playsInline
              preload="none"
              style={{ width: "100%", height: "100%", display: "block" }}
            />
          ) : (
            <button
              onClick={start}
              aria-label={t.play}
              className="group relative h-full w-full cursor-pointer"
              style={{ border: "none", padding: 0, background: "none" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/video/folyo-poster.jpg"
                alt=""
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
              <span
                className="absolute inset-0 flex items-center justify-center transition"
                style={{ background: "rgba(12,10,9,0.28)" }}
              >
                <span
                  className="flex items-center justify-center rounded-full transition group-hover:scale-105"
                  style={{
                    width: 78, height: 78,
                    background: "rgba(248,245,240,0.95)",
                    boxShadow: "0 8px 30px rgba(0,0,0,0.4)",
                  }}
                >
                  <Play size={30} strokeWidth={2} fill="#1c1917" color="#1c1917" style={{ marginLeft: 4 }} />
                </span>
              </span>
              <span
                className="absolute mono"
                style={{
                  right: 14, bottom: 12, fontSize: "0.7rem", color: "rgba(248,245,240,0.9)",
                  background: "rgba(12,10,9,0.6)", padding: "3px 8px", borderRadius: 6,
                }}
              >
                {t.duration}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
