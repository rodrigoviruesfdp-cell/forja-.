"use client";

import {
  Compass,
  Dumbbell,
  Flag,
  Flame,
  HandFist,
  type LucideIcon,
  Sunrise,
  Trophy,
  Waves,
  Weight,
  Zap,
} from "lucide-react";
import { type Ref, useId } from "react";
import type { AchievementIcon, Tone } from "@/domain/achievements/catalog";

const ICONS: Record<AchievementIcon, LucideIcon> = {
  flag: Flag,
  dumbbell: Dumbbell,
  waves: Waves,
  fist: HandFist,
  flame: Flame,
  trophy: Trophy,
  weight: Weight,
  compass: Compass,
  zap: Zap,
  sunrise: Sunrise,
};

/** Metal of each level: rim highlight, face, shadow and the icon on top. */
const PALETTE: Record<Tone, { light: string; mid: string; dark: string; icon: string }> = {
  bronze: { light: "#f6c899", mid: "#c47b3d", dark: "#6e3a14", icon: "#fff6ec" },
  silver: { light: "#ffffff", mid: "#b7bfca", dark: "#5f6874", icon: "#ffffff" },
  gold: { light: "#fff2ad", mid: "#ffc300", dark: "#a05d00", icon: "#fffbea" },
  platinum: { light: "#dcf7ff", mid: "#4fc3f7", dark: "#0f5a85", icon: "#ffffff" },
  diamond: { light: "#f4e3ff", mid: "#bf5af2", dark: "#531685", icon: "#ffffff" },
  locked: { light: "#7c7c80", mid: "#4a4a4d", dark: "#232325", icon: "#a1a1a6" },
};

interface BadgeProps {
  icon: AchievementIcon;
  tone: Tone;
  /** A secret not earned yet: a question mark instead of the icon. */
  secret?: boolean;
  className?: string;
  /** The <svg>, to turn it into an image (sharing). */
  svgRef?: Ref<SVGSVGElement>;
}

/**
 * A medal drawn by the app: a metal rim and face in the colour of the level, a soft gloss and
 * the achievement's icon. Self-contained SVG (no CSS classes inside), so it can also be
 * drawn onto the images to share.
 */
export function Badge({ icon, tone, secret = false, className, svgRef }: BadgeProps) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const colors = PALETTE[tone];
  const Icon = ICONS[icon];
  return (
    <svg
      ref={svgRef}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      width="100"
      height="100"
      aria-hidden
      className={className}
    >
      <defs>
        <linearGradient id={`${id}-rim`} x1="0.15" y1="0" x2="0.85" y2="1">
          <stop offset="0" stopColor={colors.light} />
          <stop offset="0.5" stopColor={colors.mid} />
          <stop offset="1" stopColor={colors.dark} />
        </linearGradient>
        <radialGradient id={`${id}-face`} cx="0.5" cy="0.32" r="0.75">
          <stop offset="0" stopColor={colors.mid} />
          <stop offset="1" stopColor={colors.dark} />
        </radialGradient>
        <linearGradient id={`${id}-gloss`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.5" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="49" fill={`url(#${id}-rim)`} />
      <circle cx="50" cy="50" r="41" fill={`url(#${id}-face)`} />
      <circle cx="50" cy="50" r="41" fill="none" stroke="#000000" strokeOpacity="0.22" strokeWidth="1.2" />
      <path d="M14 46 A36 36 0 0 1 86 46 Q50 36 14 46 Z" fill={`url(#${id}-gloss)`} />
      {secret ? (
        <text
          x="50"
          y="64"
          textAnchor="middle"
          fontSize="44"
          fontWeight="800"
          fontFamily='ui-rounded, "SF Pro Rounded", -apple-system, system-ui, sans-serif'
          fill={colors.icon}
        >
          ?
        </text>
      ) : (
        <>
          <Icon x={28} y={29.5} size={44} color="#000000" strokeOpacity={0.3} strokeWidth={2.2} />
          <Icon x={28} y={28} size={44} color={colors.icon} strokeWidth={2.2} />
        </>
      )}
    </svg>
  );
}

/** The main colour of a level (glows, progress bars). */
export function toneColor(tone: Tone): string {
  return PALETTE[tone].mid;
}
