"use client";

import { useEffect, useState } from "react";

// Fond du Hero qui défile entre plusieurs photos (fondu enchaîné automatique).
export default function HeroBackgroundCarousel({ images, intervalSeconds = 5 }: {
  images: string[]; intervalSeconds?: number;
}) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (images.length <= 1) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % images.length), Math.max(2, intervalSeconds) * 1000);
    return () => clearInterval(t);
  }, [images.length, intervalSeconds]);

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      {images.map((url, i) => (
        <div key={i} style={{
          position: "absolute", inset: 0,
          backgroundImage: `url(${url})`, backgroundSize: "cover", backgroundPosition: "center",
          opacity: i === index ? 1 : 0,
          transition: "opacity 1.4s ease-in-out",
        }} />
      ))}
    </div>
  );
}
