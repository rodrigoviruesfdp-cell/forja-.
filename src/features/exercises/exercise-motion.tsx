"use client";

import { useEffect, useState } from "react";
import { ExerciseImage } from "./exercise-image";

/**
 * The catalog has two photos per exercise (start and end of the movement).
 * Alternating them shows the motion like a short loop; with reduced motion
 * both are shown side by side instead.
 */
export function ExerciseMotion({ urls, alt }: { urls: string[]; alt: (step: number) => string }) {
  const [step, setStep] = useState(0);
  const [reducedMotion] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const animate = urls.length > 1 && !reducedMotion;

  useEffect(() => {
    if (!animate) return;
    const timer = setInterval(() => setStep((current) => (current + 1) % urls.length), 1400);
    return () => clearInterval(timer);
  }, [animate, urls.length]);

  if (urls.length === 0) {
    return <ExerciseImage src={undefined} alt="" className="aspect-[3/2] w-full rounded-xl" />;
  }

  if (!animate) {
    return (
      <div className="grid grid-cols-2 gap-2">
        {urls.slice(0, 2).map((url, index) => (
          <ExerciseImage key={url} src={url} alt={alt(index + 1)} eager className="aspect-[3/2] w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="relative aspect-[3/2] w-full overflow-hidden rounded-xl bg-surface-2">
      {urls.map((url, index) => (
        <ExerciseImage
          key={url}
          src={url}
          alt={alt(index + 1)}
          eager
          className={`absolute inset-0 size-full transition-opacity duration-500 ${index === step ? "opacity-100" : "opacity-0"}`}
        />
      ))}
      <div aria-hidden className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5">
        {urls.map((url, index) => (
          <span
            key={url}
            className={`h-1.5 rounded-full transition-all ${index === step ? "w-5 bg-primary" : "w-1.5 bg-black/30"}`}
          />
        ))}
      </div>
    </div>
  );
}
