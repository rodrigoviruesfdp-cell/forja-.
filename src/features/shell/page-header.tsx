"use client";

import { motion } from "motion/react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { BackButton } from "./back-button";
import { ProfileButton } from "./profile-button";

interface PageHeaderProps {
  title: ReactNode;
  /** Small caps line above the large title (e.g. today's date). */
  subtitle?: ReactNode;
  /** Shows a back button; the value is where to go if there is no history. */
  backFallback?: string;
  /** Extra round buttons on the right (add, edit…). */
  actions?: ReactNode;
  /** Hide the profile shortcut (on the profile screen itself). */
  hideProfile?: boolean;
  /** No large title: the title stays small in the bar (detail screens with their own heading). */
  compact?: boolean;
  /** Something sticky right under the bar (search field) draws the hairline instead. */
  seamless?: boolean;
}

/**
 * iOS navigation bar with a large title. At the top the bar is transparent and the title is
 * big; as you scroll, the bar turns into translucent material with a hairline and the title
 * moves into it (spring fade).
 */
export function PageHeader({
  title,
  subtitle,
  backFallback,
  actions,
  hideProfile = false,
  compact = false,
  seamless = false,
}: PageHeaderProps) {
  const barRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [scrolled, setScrolled] = useState(false);
  const [collapsed, setCollapsed] = useState(compact);

  useEffect(() => {
    const update = () => {
      setScrolled(window.scrollY > 1);
      if (compact) return;
      const bar = barRef.current?.getBoundingClientRect();
      const heading = titleRef.current?.getBoundingClientRect();
      if (bar && heading) setCollapsed(heading.bottom <= bar.bottom + 4);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [compact]);

  return (
    <>
      <div ref={barRef} className="sticky top-0 z-30 pt-safe">
        <motion.div
          aria-hidden
          initial={false}
          animate={{ opacity: scrolled ? 1 : 0 }}
          className={cn("material absolute inset-0", !seamless && "border-b")}
        />
        <div className="relative grid h-[3.25rem] grid-cols-[1fr_auto_1fr] items-center gap-2 px-4">
          <div className="flex items-center">{backFallback ? <BackButton fallback={backFallback} /> : null}</div>
          <motion.p
            aria-hidden={!compact}
            initial={false}
            animate={{ opacity: collapsed ? 1 : 0, y: collapsed ? 0 : 6 }}
            className="max-w-[52vw] truncate text-center text-headline"
          >
            {title}
          </motion.p>
          <div className="flex items-center justify-end gap-2">
            {actions}
            {hideProfile ? null : <ProfileButton />}
          </div>
        </div>
      </div>
      {compact ? (
        <h1 className="sr-only">{title}</h1>
      ) : (
        <div className="px-4 pt-1 pb-3">
          {subtitle ? (
            <p className="tracking-caption text-footnote font-semibold text-muted-foreground uppercase">{subtitle}</p>
          ) : null}
          <h1 ref={titleRef} className="text-large-title text-balance">
            {title}
          </h1>
        </div>
      )}
    </>
  );
}
