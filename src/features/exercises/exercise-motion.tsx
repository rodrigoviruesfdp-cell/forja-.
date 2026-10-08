"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { ExerciseImage } from "./exercise-image";

/**
 * The catalog has two photos per exercise (start and end of the movement).
 * Alternating them shows the motion like a short loop; with reduced motion
 * both are shown side by side instead. Corners are concentric with the card around it.
 */
export function ExerciseMotion({ urls, alt }: { urls: string[]; alt: (step: number) => string }) {
  const [step, setStep] = useState(0);
  const reducedMotion = useReducedMotion();
  const animate = urls.length > 1 && !reducedMotion;

  useEffect(() => {
    if (!animate) return;
    const timer = setInterval(() => setStep((current) => (current + 1) % urls.length), 1400);
    return () => clearInterval(timer);
  }, [animate, urls.length]);

  if (urls.length === 0) {
    return <ExerciseImage src={undefined} alt="" className="aspect-[3/2] w-full rounded-concentric" />;
  }

  if (!animate) {
    return (
      <div className="grid grid-cols-2 gap-2">
        {urls.slice(0, 2).map((url, index) => (
          <ExerciseImage key={url} src={url} alt={alt(index + 1)} eager className="aspect-[3/2] w-full rounded-concentric" />
        ))}
      </div>
    );
  }

  return (
    <div className="relative aspect-[3/2] w-full overflow-hidden rounded-concentric bg-white">
      {urls.map((url, index) => (
        <motion.div
          key={url}
          className="absolute inset-0"
          initial={false}
          animate={{ opacity: index === step ? 1 : 0 }}
          transition={{ type: "spring", stiffness: 120, damping: 24 }}
        >
          <ExerciseImage src={url} alt={alt(index + 1)} eager className="size-full" />
        </motion.div>
      ))}
      <div aria-hidden className="material absolute bottom-2.5 left-1/2 flex -translate-x-1/2 gap-1.5 rounded-full px-2 py-1.5">
        {urls.map((url, index) => (
          <motion.span
            key={url}
            initial={false}
            animate={{ width: index === step ? 18 : 6, opacity: index === step ? 1 : 0.45 }}
            className="h-1.5 rounded-full bg-foreground"
          />
        ))}
      </div>
    </div>
  );
}
