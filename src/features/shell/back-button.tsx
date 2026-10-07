"use client";

import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "use-intl";

/** Goes back in history when there is one (keeps scroll and filters), otherwise to `fallback`. */
export function BackButton({ fallback }: { fallback: string }) {
  const router = useRouter();
  const t = useTranslations("common");
  return (
    <button
      type="button"
      aria-label={t("back")}
      onClick={() => (window.history.length > 1 ? router.back() : router.push(fallback))}
      className="-ml-2 flex size-11 shrink-0 items-center justify-center rounded-full hover:bg-surface-2"
    >
      <ChevronLeft className="size-6" />
    </button>
  );
}
