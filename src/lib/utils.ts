import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * tailwind-merge must know the custom theme scales (globals.css): otherwise it reads
 * `text-body` as a color and drops `text-foreground` (or the other way round).
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        {
          text: [
            "large-title",
            "title-1",
            "title-2",
            "title-3",
            "headline",
            "body",
            "callout",
            "subhead",
            "footnote",
            "caption",
            "caption-2",
          ],
        },
      ],
      shadow: [{ shadow: ["card", "float"] }],
      "font-family": [{ font: ["rounded"] }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
