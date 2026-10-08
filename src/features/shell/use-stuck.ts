"use client";

import { type RefObject, useEffect, useState } from "react";

/** True while a `position: sticky` element is pinned (scrolled up to its `top`). */
export function useStuck(ref: RefObject<HTMLElement | null>): boolean {
  const [stuck, setStuck] = useState(false);
  useEffect(() => {
    const update = () => {
      const node = ref.current;
      if (!node) return;
      const top = Number.parseFloat(getComputedStyle(node).top) || 0;
      setStuck(window.scrollY > 0 && node.getBoundingClientRect().top <= top + 0.5);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [ref]);
  return stuck;
}
