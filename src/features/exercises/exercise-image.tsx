"use client";

import { Dumbbell } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface ExerciseImageProps {
  src: string | undefined;
  alt: string;
  className?: string;
  eager?: boolean;
}

/** Catalog photo with a neutral placeholder (custom exercises have no image; offline may miss one). */
export function ExerciseImage({ src, alt, className, eager = false }: ExerciseImageProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div aria-hidden className={cn("flex items-center justify-center bg-surface-2 text-tertiary-foreground", className)}>
        <Dumbbell className="size-1/3" strokeWidth={1.8} />
      </div>
    );
  }

  return (
    // Plain <img>: catalog images come from a public CDN and are cached by the service worker.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      crossOrigin="anonymous"
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      onError={() => setFailed(true)}
      className={cn("bg-white object-cover", className)}
    />
  );
}
