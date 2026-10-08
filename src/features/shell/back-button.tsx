"use client";

import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "use-intl";
import { IconButton } from "@/components/ui/icon-button";
import { setNavDirection } from "./nav-direction";

/** Goes back in history when there is one (keeps scroll and filters), otherwise to `fallback`. */
export function BackButton({ fallback }: { fallback: string }) {
  const router = useRouter();
  const t = useTranslations("common");
  return (
    <IconButton
      aria-label={t("back")}
      onClick={() => {
        setNavDirection("back");
        if (window.history.length > 1) router.back();
        else router.push(fallback);
      }}
    >
      <ChevronLeft strokeWidth={2.4} className="-ml-0.5" />
    </IconButton>
  );
}
