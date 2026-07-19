"use client";

import { useEffect, useRef, useState } from "react";

// Compte de 0 à `value` une seule fois, quand l'élément entre dans l'écran.
// Formatage figé en fr-FR (espace des milliers) — seul usage de ce composant
// sur ce site francophone. Pas de prop fonction : ce composant est rendu
// depuis des Server Components, qui ne peuvent pas passer de fonctions en props.
export default function AnimatedCounter({ value, durationMs = 1400 }: {
  value: number; durationMs?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setDisplay(value); return; }

    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting || started.current) return;
        started.current = true;
        io.unobserve(el);
        const start = performance.now();
        const tick = (now: number) => {
          const p = Math.min(1, (now - start) / durationMs);
          const eased = 1 - Math.pow(1 - p, 3); // ease-out cubic
          setDisplay(Math.round(eased * value));
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
    }, { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, [value, durationMs]);

  return <span ref={ref}>{display.toLocaleString("fr-FR")}</span>;
}
